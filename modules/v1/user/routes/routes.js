const User = require("../controller/User");
const middleware = require("../../../../middlewares/data-validation");

const user = (app) =>{
    app.post("/v1/user/signup", User.signup);

    app.post("/v1/user/login", User.login);
    app.post("/v1/user/logout", User.logout);

    app.post("/v1/user/forgot-password", User.forgot_password);
    app.post("/v1/user/reset-password", User.reset_password);
    app.post("/v1/user/change-password", User.change_password);

    app.post("/v1/user/category-listing", User.category_listing);

    app.post("/v1/user/complete-profile", User.complete_profile);
    app.post("/v1/user/edit-profile", User.edit_profile);

    app.post("/v1/user/addDeal", User.add_deal);
    app.post("/v1/user/addPost", User.add_post);
    app.post("/v1/user/list-deals", User.deal_listing_main);
    app.post("/v1/user/deal_detail/:id", User.deal_detail);
    app.post("/v1/user/saved-deals", User.saved_deals);
    app.post("/v1/user/filter-data", User.filter_data);
    app.post("/v1/user/rating-deal", User.rating_deal);
    app.post("/v1/user/like-unlike", User.like_unlike);

    app.post("/v1/user/profile_user_loggedin", User.profile_user_loggedin);
    app.post("/v1/user/profile_user/:id", User.profile_user);


    app.post("/v1/user/followers", User.get_followers);
    app.post("/v1/user/following", User.get_following);
    
    app.post("/v1/user/contact-us", User.contact_us);
    app.post("/v1/user/report", User.report);

    app.post("/v1/user/comment-deal/:id", User.comment_deal);
    app.post("/v1/user/comment-post/:id", User.comment_post);

    app.post("/v1/user/delete-account", User.account_delete);

}

module.exports = user;