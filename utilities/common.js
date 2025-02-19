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
        
        // database.query(selectUserQuery, [user_id], function(error, user){
        //     if(error){
        //         callback(error, []);
        //     }
        //     else{
        //         if(user.length > 0){
        //             callback(undefined, user[0]);
        //         }
        //         else{
        //             callback("No User Found", []);
        //         }
        //     }
        // });
    }

    async updateUserInfo(user_id, user_data, callback){
            const updateFields = { ...user_data, is_active: 1 };
            const updateQuery = "UPDATE tbl_user SET ? WHERE user_id = ?";
            
            try{
                const [updatedUser] = await database.query(updateQuery, [updateFields, user_id]);
                if (updatedUser.affectedRows > 0) {
                    self.getUserDetail(user_id, user_id, function(err, userInfo) {
                        if (err) {
                            return callback(err, null);
                        } else {
                            return callback(null, userInfo);
                        }
                });
                } else {
                    return callback("No User Found, Can't Update", null);
                }

            } catch(error){
                return callback(error, null);
            }

            
            // database.query(updateQuery, [updateFields, user_id], function(err, updatedUser) {
            //     if (err) {
            //         callback(err, null);
            //         return;
            //     }
                
            //     if (updatedUser.affectedRows > 0) {
            //         self.getUserDetail(user_id, user_id, function(err, userInfo) {
            //             if (err) {
            //                 callback(err, null);
            //             } else {
            //                 callback(null, userInfo);
            //             }
            //         });
            //     } else {
            //         callback("No User Found, Can't Update", null);
            //     }
            // });
        }


}

module.exports = new common();