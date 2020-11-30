const FS = require('fs');
const ZIP = require('adm-zip');

function extract_zip_file(src_zip_path, target_path) {
    const zip = new ZIP(src_zip_path);
    zip.extractAllTo(target_path, true);
}

function delete_file(path) {
    FS.unlinkSync(path);
}

function get_run_name_from_zip(zip_name) {
    return zip_name.split('.')[0];
}

function get_abs_extracted_folder() {
    return `${__dirname}/public/run/`;
}

function get_abs_extracted_folder_from_run_name(run_name) {
    return `${__dirname}/public/run/${run_name}`;
}

function get_abs_path(path) {
    return `${__dirname}/public/${path}`
}

function file_exists(path) {
    return FS.existsSync(path);
}

function read_json_file(path) {    
    var data = JSON.parse(FS.readFileSync(path));
    return data;
}

function get_all_run() {
    return FS.readdirSync(get_abs_extracted_folder());
}

function get_player_state_file_name(root_folder, round) {
    var round_string;
    if (round == -1) {
        round_string = 'init';
    } else {
        round_string = round.toString();
    }
    const path = root_folder + "/player_state_trace/" + round_string + ".json";
    return get_abs_extracted_folder_from_run_name(path);
}

function get_message_file_name(root_folder, round) {
    const path = root_folder + "/message_trace/" + round.toString() + ".json";
    return get_abs_extracted_folder_from_run_name(path);
}

function execute_java_backend(zip_path) {
    var exec = require('child_process').exec, child;
    child = exec('java -cp ' 
        + 'C:\\Users\\StevenLu\\Desktop\\BlockchainSimulator\\blockchain-simulator\\target\\blockchain-simulator-1.0-SNAPSHOT-jar-with-dependencies.jar' 
        + ' ' + 'com.blockchain.simulator.App' + ' ' + zip_path,
    function (error, stdout, stderr){
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if(error !== null){
            console.log('exec error: ' + error);
        }
    });
} 

function get_config_file_path(run_name) {
    const path = run_name + '/config.json';
    return get_abs_extracted_folder_from_run_name(path);
}

module.exports = {
    extract_zip_file,
    get_abs_extracted_folder,
    get_abs_path,
    file_exists,
    read_json_file,
    get_player_state_file_name,
    get_message_file_name,
    execute_java_backend,
    delete_file,
    get_run_name_from_zip,
    get_abs_extracted_folder_from_run_name,
    get_all_run,
    get_config_file_path
};
