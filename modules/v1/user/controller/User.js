var userModel = require("../models/User-model");
var common = require("../../../../utilities/common");
const response_code = require("../../../../utilities/response-error-code");
const {default: localizify} = require('localizify');
const validator = require("../../../../middlewares/validators");
const { t } = require('localizify');
const vrules = require("../../../validation_rules");

class User{
    async signup(req,res){
        try{
            var request_data = req.body;
            var rules = vrules.signup;
            console.log(rules)
            var message = {
                required: t('required'),
                email: t('email'),
                'phone_number.min': t('mobile_number_min'),
                'phone_number.regex': t('mobile_number_numeric'),
                'passwords.min': t('passwords_min')
            }
            var keywords = {
                'email_id': t('rest_keywords_email_id'),
                'passwords': t('rest_keywords_password')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.signup(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
    }

    async login(req,res){
        try{
            var request_data = req.body;
            var rules = vrules.login;
            var message = {
                required: t('required'),
                email: t('email'),
                'passwords.min': t('passwords_min')
            }
            var keywords = {
                'email_id': t('rest_keywords_email_id'),
                'passwords': t('rest_keywords_password')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.login(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });

        }
        
    }

    async logout(req, res) {
        try {
            const request_data = req.body;
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

    async forgot_password(req,res){
        try{
            var request_data = req.body;
            var rules = vrules.forgot_password;
            var message = {
                required: t('required'),
                email: t('email')
            }
            var keywords = {
                'email_id': t('rest_keywords_email_id')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.forgot_password(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
        
    }

    async reset_password(req,res){
        try{
            var request_data = req.body;

            var rules = vrules.reset_password;
            var message = {
                required: t('required'),
                'new_password.min': t('passwords_min'),
                // 'reset_token.min': t('token_min'),
                // 'reset_token.max': t('token_max')
            }
            var keywords = {
                'email_id': t('rest_keywords_email_id')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.reset_password(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
        
    }

    async complete_profile(req,res){
        try{
            console.log("User language:", req.userLang);
            var request_data = req.body;
            console.log(request_data)

            var rules = vrules.complete_profile;
            var message = {
                required: t('required')
            }
            var keywords = {
                'user_id': t('rest_keywords_user_id'),
                'profile_pic': t('rest_keywords_profile')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            console.log(isValid);
            if (!isValid) return;

            userModel.complete_profile(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            console.error("Error in complete_profile:", error);
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
        
    }

    async change_password(req,res){
        try{
            var request_data = req.body;

            var rules = vrules.changePassword;

            var message = {
                required: t('required'),
                'old_password.min': t('passwords_min'),
                'new_password.min': t('passwords_min')
            }
            var keywords = {
                'new_password': t('rest_keywords_password'),
                'old_password': t('rest_keywords_password')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.changePassword(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
    }
    
    async category_listing(req,res){
        var request_data = req.body;
        userModel.category_listing(request_data, (_response_data)=>{
            common.response(res, _response_data);
        });
    }

    async add_deal(req,res){
        try{
            var request_data = req.body;

            var rules = vrules.add_deal;
            var message = {
                required: t('required')
            }
            var keywords = {
                'descriptions': t('rest_keywords_descriptions')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.add_deal(request_data, request_data.user_id, (response_data) => {
                common.response(res, response_data);
            });

        } catch(error){
            console.error(error);
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
        
    }

    async add_post(req,res){
        try{
            var request_data = req.body;

            var rules = vrules.add_post;

            var message = {
                required: t('required')
            }
            var keywords = {
                'descriptions': t('rest_keywords_descriptions'),
                'user_id': t('rest_keywords_user_id')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.add_post(request_data, request_data.user_id, (response_data) => {
                common.response(res, response_data);
            });

        } catch(error){
            console.error(error);
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
    }

    async deal_listing_main(req,res){
        const request_data = req.body;
        userModel.deal_listing_main(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    async deal_detail(req,res){
        const request_data = req.body;
        const deal_id = req.params.id;
        userModel.deal_detail(request_data, request_data.user_id, deal_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    async profile_user_loggedin(req,res){
        const request_data = req.body;
        userModel.profile_user_loggedin(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    async profile_user(req,res){
        const request_data = req.body;
        const user_id = req.params.id;
        userModel.profile_user(request_data, user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    async edit_profile(req,res){
        const request_data = req.body;
        userModel.edit_profile(request_data, request_data.user_id, (response_data) => {
            common.response(res, response_data);
        });
    }

    async get_followers(req,res){
        const request_data = req.body;
        userModel.get_followers(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });

    }

    async get_following(req,res){
        const request_data = req.body;
        userModel.get_following(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    async contact_us(req,res){
        try{
            var request_data = req.body;

            var rules = vrules.contact_us;
            var message = {
                required: t('required'),
                email: t('email')
            }
            var keywords = {
                'email_id': t('rest_keywords_email_id')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;

            userModel.contact_us(request_data, request_data.user_id, (response) => {
                common.response(res, response);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: t('rest_keywords_something_went_wrong')
            });
        }
    }

    async report(req,res){
        const request_data = req.body;
        userModel.report(request_data, request_data.reported_by_id, (response) => {
        common.response(res, response);
    });
        
    }
    
    async comment_deal(req,res){
        const request_data = req.body;
        const deal_id = req.params.id;
        userModel.comment_deal(request_data, deal_id, request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    async comment_post(req,res){
        const request_data = req.body;
        const deal_id = req.params.id;
        userModel.comment_post(request_data, deal_id, request_data.user_id, (response) => {
        common.response(res, response);
    });
        
    }

    async account_delete(req,res){
        const request_data = req.body;
        userModel.delete_account(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });
    }

    async saved_deals(req,res){
        const request_data = req.body;
        userModel.saved_deals(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });  
    }

    async filter_data(req,res){
        const request_data = req.body;
        userModel.filter_data(request_data, (response) => {
        common.response(res, response);
    });  
    }

    async rating_deal(req,res){
        const request_data = req.body;
        userModel.rating_deal(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });  
    }

    async like_unlike(req,res){
        const request_data = req.body;
        userModel.like_unlike(request_data, request_data.user_id, (response) => {
        common.response(res, response);
    });  
    }
    

}

module.exports = new User();