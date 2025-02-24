var userModel = require("../models/User-model");
var common = require("../../../../utilities/common");
const response_code = require("../../../../utilities/response-error-code");

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

    async logout(req, res) {
        try {
            const request_data = req.body;
    
            if (!request_data.user_id) {
                return res.status(400).json({
                    code: response_code.BAD_REQUEST,
                    message: "User ID is required"
                });
            }
    
            userModel.logout(request_data, (response_data) => {
                return common.response(res, response_data);
            });
    
        } catch (error) {
            return res.status(500).json({
                code: response_code.OPERATION_FAILED,
                message: error.message || "Logout Failed"
            });
        }
    }

    forgot_password(req,res){
        var request_data = req.body;
        userModel.forgot_password(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

    reset_password(req,res){
        var request_data = req.body;
        userModel.reset_password(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

    complete_profile(req,res){
        var request_data = req.body;
        userModel.complete_profile(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

    change_password(req,res){
        var request_data = req.body;
        userModel.changePassword(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }
    
    category_listing(req,res){
        var request_data = req.body;
        userModel.category_listing(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

    add_deal(req,res){
        const request_data = req.body;
        if (!request_data.title || !request_data.descriptions || !request_data.category_name) {
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Missing required fields"
           });
        }

        userModel.add_deal(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    add_post(req,res){
        const request_data = req.body;
        if (!request_data.title || !request_data.descriptions || !request_data.category_name) {
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Missing required fields"
           });
        }
        userModel.add_post(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    deal_listing_main(req,res){
        const request_data = req.body;
        userModel.deal_listing_main(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    deal_detail(req,res){
        const request_data = req.body;
        const deal_id = req.params.id;
        userModel.deal_detail(request_data, request_data.user_id, deal_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    profile_user_loggedin(req,res){
        const request_data = req.body;
        userModel.profile_user_loggedin(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    profile_user(req,res){
        const request_data = req.body;
        const user_id = req.params.id;
        userModel.profile_user(request_data, user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    edit_profile(req,res){
        const request_data = req.body;
        userModel.edit_profile(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    get_followers(req,res){
        const request_data = req.body;
        userModel.get_followers(request_data.user_id, (response) => {
        common.response(res, response);
    });

    }

    get_following(req,res){
        const request_data = req.body;
        userModel.get_following(request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    contact_us(req,res){
        const request_data = req.body;
        userModel.contact_us(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    report(req,res){
        const request_data = req.body;
        userModel.report(request_data, request_data.reported_by_id, (response) => {
        common.response(res, response);
    });
        
    }
    
    comment_deal(req,res){
        const request_data = req.body;
        const deal_id = req.params.id;
        userModel.comment_deal(request_data, deal_id, request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    comment_post(req,res){
        const request_data = req.body;
        const deal_id = req.params.id;
        userModel.comment_post(request_data, deal_id, request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    account_delete(req,res){
        const request_data = req.body;
        userModel.delete_account(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });
    }

    saved_deals(req,res){
        const request_data = req.body;
        userModel.saved_deals(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });  
    }

    filter_data(req,res){
        const request_data = req.body;
        userModel.filter_data(request_data, (response) => {
        common.response(res, response);
    });  
    }

}

module.exports = new User();