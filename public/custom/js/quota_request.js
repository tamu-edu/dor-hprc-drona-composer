function checkLength (value){
    var x = document.getElementById("need-PI-request");
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    if (value === "yes") {
        x.style.display = "block";
        bodyFields.style.display = "none";
    } else {
        x.style.display = "none";
        bodyFields.style.display = "block";
        extraFields.style.display = "none";
        submitField.style.display = "block";
        justificationField.required = true;
    } 
}

function checkPi (value){
    var PiNotice = document.getElementById("Pi-notice");
    var confirmBuyin = document.getElementById("buyin-option");
    var extraFields = document.getElementById("extra-form-fields");
    var bodyFields = document.getElementById("body-form-fields");
    var submitField = document.getElementById("submit-field");
    if (value === "yes") {
        PiNotice.style.display = "none";
        confirmBuyin.style.display = "block";
    } else {
        PiNotice.style.display = "block";
        confirmBuyin.style.display = "none";
        bodyFields.style.display = "none";
        submitField.style.display = "none";
        extraFields.style.display = "none";
    } 
    
}

function checkBuyin(value){
    var bodyFields = document.getElementById("body-form-fields");
    var extraFields = document.getElementById("extra-form-fields");
    var buyinStorage = document.getElementById("buyin-storage");
    var submitField = document.getElementById("submit-field");
    var justificationField = document.getElementById("justification-field");
    if (value === "yes") {
        bodyFields.style.display = "none";
        extraFields.style.display = "block";
        buyinStorage.style.display = "block";
        // justificationField.required = false;
        
    } else {
        bodyFields.style.display = "block";
        extraFields.style.display = "block";
        buyinStorage.style.display = "none";
        justificationField.required = true;
    }
    submitField.style.display = "block";
}


