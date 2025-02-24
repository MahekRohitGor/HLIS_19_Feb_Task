var database = require("../config/database");

class common{
    generateOtp(length){
        if(length <= 0){
            throw new Error("OTP length must be greater than 0");
        }
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }

    generateToken(length){
        if(length <= 0){
            throw new Error("Token length must be greater than 0");
        }
        const alphaNumeric = '0123456789qwertyuiopasdfghjklzxcvbnm';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += alphaNumeric[Math.floor(Math.random() * alphaNumeric.length)];
        }
        return token;
    }

    response(res,message){
        return res.json(message);
    }

    async getUserDetail(user_id, login_user_id, callback){
        var selectUserQuery = "SELECT user_name, followers_count, following_count, about from tbl_user where user_id = ?";
        
        try{

            const [user] = await database.query(selectUserQuery, [user_id])
            if(user.length > 0){
                return callback(undefined, user[0]);
            }
            else{
                return callback("No User Found", []);
            }

        } catch(error){

            return callback(error, []);
        }
    }

    async getUserDetailLogin(user_id, login_type, callback){
        console.log("User ID:", user_id);
        console.log("Login Type:", login_type);
        var selectUserQuery;
        if(login_type == "S"){
            selectUserQuery = "SELECT user_name, followers_count, following_count, about from tbl_user where user_id = ?";
        } else{
            selectUserQuery = "SELECT s.name_, u.followers_count, u.following_count, u.about from tbl_user u inner join tbl_socials s on s.social_id = u.social_id where u.user_id = ?";
        }
        
        try{

            const [user] = await database.query(selectUserQuery, [user_id])
            console.log("User", user);
            if(user.length > 0){
                return callback(undefined, user[0]);
            }
            else{
                return callback("No User Found", []);
            }

        } catch(error){

            return callback(error, []);
        }
    }

    async updateUserInfo(user_id, user_data, callback){
            const updateFields = { ...user_data};
            const updateQuery = "UPDATE tbl_user u INNER JOIN tbl_otp o ON u.user_id = o.user_id SET o.verify = 1 WHERE o.otp = ? and u.user_id = ? and o.verify = 0";
            
            try{
                const [updatedUser] = await database.query(updateQuery, [updateFields.otp, user_id]);
                console.log("Updated User:", updatedUser);
                if (updatedUser.affectedRows > 0) {
                    await self.getUserDetail(user_id, user_id, function(err, userInfo) {
                        console.log("UserInfo: ", userInfo);
                        if (err) {
                            console.log(err);
                            return callback(err, null);
                        } else {
                            console.log(userInfo);
                            return callback(null, userInfo);
                        }
                });
                } else {
                    return callback("Either NO USER FOUND or Your Email ID is already verified", null);
                }

            } catch(error){
                return callback(error, null);
            }

        }

    async updateUserInfoGeneral(id, data, callback){
        var updateUserQuery = "UPDATE tbl_user SET ? where user_id = ?";
        try{
            const [result] = database.query(updateUserQuery, [data, id]);
            this.getUserDetail(id, id, (error, result)=>{
                if(error){
                    return callback(error, undefined);
                } else{
                    return callback(undefined, result);
                }
            });

        }catch(error){
            return callback(error, undefined);
        }
    }


}

module.exports = new common();