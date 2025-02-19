var userModel = require("../models/User-model");
var common = require("../../../../utilities/common");

class User{

    signup(req,res){
        var request_data = req.body;
        userModel.signup(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

    login(req,res){
        var request_data = req.body;
        userModel.login(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

}

module.exports = new User();