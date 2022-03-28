// Clean this Code if you have time, refactor these wet variable (Dry it out)

function checkLength (value){
    var x = document.getElementById("need-PI-request");
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    if (value === "yes") {
        x.style.display = "block";
        bodyFields.style.display = "none";
    } else {
        x.style.display = "none";
        bodyFields.style.display = "block";
        extraFields.style.display = "none";
        currentFields.style.display = "block";
        submitField.style.display = "block";
        justificationField.required = true;
    }
}

function checkPi (value){
    var PiNotice = document.getElementById("Pi-notice");
    var confirmBuyin = document.getElementById("buyin-option");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var bodyFields = document.getElementById("body-form-fields");
    var submitField = document.getElementById("submit-field");
    if (value === "yes") {
        PiNotice.style.display = "none";
        confirmBuyin.style.display = "block";
    } else {
        PiNotice.style.display = "block";
        confirmBuyin.style.display = "none";
        bodyFields.style.display = "none";
        currentFields.style.display = "none";
        submitField.style.display = "none";
        extraFields.style.display = "none";
    } 
    
}

function checkBuyin(value){
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var currentFields = document.getElementById("current-status-fields");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    if (value === "yes") {
        bodyFields.style.display = "none";
        extraFields.style.display = "block";
        justificationField.required = false;
        
    } else {
        bodyFields.style.display = "block";
        extraFields.style.display = "block";
        justificationField.required = true;
    }
    submitField.style.display = "block";
    currentFields.style.display = "block";
}

// Quota Request Log File
// function logFile() {
//     var formData = new FormData(document.querySelector('form'));
//     console.log(formData);
// }

// const fs = require('fs');


// modalQuotaRequestForm.onsubmit = async (e) => {
//     e.preventDefault();

//     const log = fs.createWriteStream('log.txt', { flags: 'a' });
//     // let response = await fetch('/article/formdata/post/user', {
//     //   method: 'POST',
//     formData = new FormData(modalQuotaRequestForm);
//     // });

    
    
//     var message = "";
//     for(var pair of formData.entries()) {
//         message += pair[0]+ ', '+ pair[1] + '\t';
//         console.log(message)
//     }
//     message += '\n';
//     console.log(message);
//     log.write(message);

//     log.end();

// };






