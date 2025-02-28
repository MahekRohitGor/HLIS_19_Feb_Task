const { signup, forgot_password, complete_profile, changePassword, add_deal } = require("./v1/user/models/User-model");

const rules = {
    signup: {
            email_id: "required|email",
            user_name: "required_without:social_id",
            fname: "required_without:social_id",
            lname: "required_without:social_id",
            phone_number: "required_without:social_id|nullable|string|min:10|regex:/^[0-9]+$/|max:10",
            passwords: "required_without:social_id|nullable|min:8",
            login_type: "required_without:social_id",
            social_id: "required_without:login_type"
    },
    login:{
        email_id: "required|email",
        login_type: "required_without:social_id",
        social_id: "required_without:login_type",
        passwords: "required_without:social_id|nullable|min:8"
    },
    forgot_password:{
        email_id: "required|email"
    },
    reset_password: {
        reset_token: "required|min:40|max:40",
        new_password: "required|min:8"
    },
    complete_profile: {
        user_id: "required",
        profile_pic: "required"
    },
    changePassword: {
        user_id: "required",
        old_password: "required|min:8",
        new_password: "required|min:8"
    },
    add_deal:{
        descriptions: "required",
        title: "required",
        website_url: "required",
        category_name: "required",
        image_name: "required"
    },
    add_post: {
        descriptions: "required",
        title: "required",
        category_name: "required",
        user_id: "required"
    },
    contact_us: {
        email_id: "required|email"
    }
}

module.exports = rules;