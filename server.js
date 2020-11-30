const util = require('./util');
const mkdirp = require('mkdirp');
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { get_run_name_from_zip } = require('./util');
const app = express();
// middle ware
app.use(express.static('public')); //to access the files in public folder
app.use(cors()); // it enables all cors requests
app.use(fileUpload());
// file upload api
app.post('/upload', (req, res) => {
    if (!req.files) {
        return res.status(500).send({ msg: "file is not found" })
    }
    // accessing the file
    const myFile = req.files.file;
    const zip_file_directory = util.get_abs_path(myFile.name);
    //  mv() method places the file inside public directory
    myFile.mv(zip_file_directory, function (err) {
        if (err) {
            console.log(err)
            return res.status(500).send({ msg: "Error occured" });
        }
        util.extract_zip_file(zip_file_directory, util.get_abs_extracted_folder());
        util.delete_file(zip_file_directory);
        
        // run_name.zip
        const run_name = myFile.name.split('.')[0];
        const run_folder_full_path = util.get_abs_extracted_folder_from_run_name(run_name);
        util.execute_java_backend(run_folder_full_path);
        // returing the response with file path and name
        return res.status(200).send({ name: get_run_name_from_zip(myFile.name)});
    });
});

app.get('/player_state/run_id/:run_id/round/:round', (req, res) => {
    const run_name = req.params.run_id;
    const round = req.params.round;
    console.log("got round " + round + " run_name " + run_name)
    const file_path = util.get_player_state_file_name(run_name, round);
    if (!util.file_exists(file_path)) {
        return res.status(500).send({msg: "file not found" + file_path});
    }
    const json_body = util.read_json_file(file_path);
    console.log(json_body)
    return res.status(200).send({data: json_body});
});

app.get('/message/run_id/:run_id/round/:round', (req, res) => {
    const run_name = req.params.run_id;
    const round = req.params.round;
    const file_path = util.get_message_file_name(run_name, round);
    if (!util.file_exists(file_path)) {
        return res.status(500).send({msg: "file not found" + file_path});
    }
    const json_body = util.read_json_file(file_path);
    return res.status(200).send({data: json_body});
});

app.get('/list_run', (req, res) => {
    var files = util.get_all_run();
    return res.status(200).send({data: files});
});


app.get('/streamlet_config/run_id/:run_id', (req, res) => {
    const run_name = req.params.run_id;
    const file_path = util.get_config_file_path(run_name);
    if (!util.file_exists(file_path)) {
        return res.status(500).send({message: 'Config file not found for ' + run_name});
    }
    const json_body = util.read_json_file(file_path);
    return res.status(200).send({data: json_body.streamlet_config});
});

app.listen(4500, () => {
    mkdirp.sync(util.get_abs_extracted_folder());
    console.log('Server listening on port 4500');
});

