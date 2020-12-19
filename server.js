const util = require('./util');
const mkdirp = require('mkdirp');
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const app = express();
const FS = require('fs');
const ARCHIVER = require('archiver');
const path = require('path');
const e = require('express');
// middle ware
app.use(express.static('public')); //to access the files in public folder
app.use(cors()); // it enables all cors requests
app.use(fileUpload());
// file upload api
app.post('/upload', (req, res) => {
    if (!req.files) {
        return res.status(500).send({ message: "file is not found" })
    }
    // accessing the file
    const myFile = req.files.file;
    const zip_file_directory = util.get_abs_path(myFile.name);
    //  mv() method places the file inside public directory
    myFile.mv(zip_file_directory, function (err) {
        if (err) {
            return res.status(500).send({ message: "Error occured " + err });
        }
        util.extract_zip_file(zip_file_directory, util.get_abs_extracted_folder());
        util.delete_file(zip_file_directory);
        var exec = require('child_process').exec;
        // run_name.zip
        const run_name = util.get_run_name_from_zip(myFile.name);
        const run_folder_full_path = util.get_abs_extracted_folder_from_run_name(run_name);

        exec('java -cp ' 
            + '../blockchain-simulator/target/blockchain-simulator-1.0-SNAPSHOT-jar-with-dependencies.jar' 
            + ' ' + 'com.blockchain.simulator.App' + ' ' + run_folder_full_path,
        (error, stdout, stderr) => {
            if (error) {
                console.log(stderr);
                return res.status(500).send({ message: stderr });
            }
            const abs_zip_path = util.get_abs_exec_result_zip_path(run_name);
            try {
                var zip_message = util.zip_folder(run_folder_full_path, abs_zip_path);
                if (util.file_exists(abs_zip_path)) {
                    return res.status(200).send({ name: run_name, path: run_folder_full_path});
                } else {
                    return res.status(500).send({ message: "Did not find result zip folder" });
                }
            } catch (e) {
                return res.status(500).send({ message: e.toString() });
            }
        });
        // returing the response with file path and name
        // return res.status(200).send({ name: run_name, path: run_folder_full_path});
    });
});

app.post('/exec', (req, res) => {
    if (!req.files) {
        return res.status(500).send({ message: "file is not found" })
    }

    var exec = require('child_process').exec;
    
    // accessing the file
    const myFile = req.files.file;
    const zip_file_directory = util.get_abs_path(myFile.name);
    //  mv() method places the file inside public directory
    myFile.mv(zip_file_directory, function (err) {
        if (err) {
            return res.status(500).send({ message: err });
        }
        try {
            util.extract_zip_file(zip_file_directory, util.get_abs_exec_folder());
            util.delete_file(zip_file_directory);
        } catch(e) {
            return res.status(500).send({message: e.toString()});
        }
        
        // run_name.zip
        const run_name = util.get_run_name_from_zip(myFile.name);
        const run_folder_full_path = util.get_abs_exec_run_folder(run_name);
        exec('java -cp ' 
            + '../blockchain-simulator/target/blockchain-simulator-1.0-SNAPSHOT-jar-with-dependencies.jar' 
            + ' ' + 'com.blockchain.simulator.App' + ' ' + run_folder_full_path,
        (error, stdout, stderr) => {
            if (error) {
                console.log(stderr);
                return res.status(500).send({message: stderr });
            }
            var zip_message;
            try {
                const abs_zip_path = util.get_abs_exec_result_zip_path(run_name);
                const output = FS.createWriteStream(abs_zip_path);
                const archive = ARCHIVER('zip');
                var zip_message = {"output_zip": abs_zip_path};
                output.on('close', function() {
                    return res.status(200).send({"result": "Succeeded"});
                });
                archive.on('error', function(err){
                    return res.status(500).send({message: zip_message});
                });
                archive.pipe(output);
                archive.directory(run_folder_full_path, false);
                archive.finalize();
            } catch (e) {
                return res.status(500).send({message: e.toString()});
            }
        });
    });
});

app.get('/player_state/run_id/:run_id/round/:round', (req, res) => {
    const run_name = req.params.run_id;
    const round = req.params.round;
    console.log("got round " + round + " run_name " + run_name)
    const file_path = util.get_player_state_file_name(run_name, round);
    if (!util.file_exists(file_path)) {
        return res.status(500).send({message: "file not found" + file_path});
    }
    try{
        const json_body = util.read_json_file(file_path);
        console.log(json_body)
        return res.status(200).send({data: json_body});
    } catch (e) {
        return res.status(500).send({message: e.toString()});
    }
    
});

app.get('/message/run_id/:run_id/round/:round', (req, res) => {
    const run_name = req.params.run_id;
    const round = req.params.round;
    const file_path = util.get_message_file_name(run_name, round);
    if (!util.file_exists(file_path)) {
        return res.status(500).send({message: "file not found" + file_path});
    }
    try {
        const proposal_path = util.get_proposal_file_name(run_name, round);
        const json_body = util.read_json_file(file_path);
        if (util.file_exists(proposal_path)) {
            json_body.proposal = util.read_json_file(proposal_path);
        }
        return res.status(200).send({data: json_body});
    } catch (e) {
        return res.status(500).send({message: e.toString()});
    }
    
});

app.get('/list_run', (req, res) => {
    try {
        var files = util.get_all_run();
        return res.status(200).send({data: files});
    } catch (e) {
        return res.status(500).send({message: "Failed to list all cases, error: " + e.toString()});
    }
    
});

app.get('/get_run/:run_zip_name', (req, res) => {
    const run_name = req.params.run_zip_name.split(".")[0];
    const abs_zip_path = util.get_abs_exec_result_zip_path(run_name);
    if (util.file_exists(abs_zip_path)) {
        console.log('send download' + abs_zip_path);
        res.sendFile(abs_zip_path);
    } else {
        return res.status(500).send({ message: "Failed to get the running results due to network issue, try again usually works" });
    }
});

app.get('/config/run_id/:run_id', (req, res) => {
    const run_name = req.params.run_id;
    const config_path = util.get_config_file_path(run_name);
    const message_path = util.get_message_file_name(run_name, 0);
    const state_path = util.get_player_state_file_name(run_name, -1);
    if (!util.file_exists(config_path)) {
        return res.status(500).send({message: 'Config file not found for ' + run_name});
    }
    if (!util.file_exists(message_path)) {
        return res.status(500).send({message: 'Message file of round 0 not found for ' + run_name});
    }
    if (!util.file_exists(state_path)) {
        return res.status(500).send({message: 'Init player state file not found for ' + run_name});
    }
    try {
        const config_body = util.read_json_file(config_path);
        const state_body = util.read_json_file(state_path);
        const message_body = util.read_json_file(message_path);
        return res.status(200).send({config: config_body, state_trace: state_body, message_trace: message_body});
    } catch (e) {
        return res.status(500).send({message: e.toString()});
    }
    
});

app.listen(4500, () => {
    mkdirp.sync(util.get_abs_extracted_folder());
    mkdirp.sync(util.get_abs_exec_folder());
    console.log('Server listening on port 4500');
});

