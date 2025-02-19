const common = require("../../../../utilities/common");
const database = require("../../../../config/database");
const response_code = require("../../../../utilities/response-error-code");
const md5 = require("md5");

class userModel{
    async signup(request_data, callback){
        console.log(request_data);

        const user_data = {
            user_name: request_data.user_name,
            fname: request_data.fname,
            lname: request_data.lname,
        }
        
        if(request_data.passwords != undefined){
            user_data.passwords = md5(request_data.passwords);
        }
        if(request_data.email_id != undefined && request_data.email_id != ""){
            user_data.email_id = request_data.email_id;
        }
        if(request_data.phone_number != undefined && request_data.phone_number != ""){
            user_data.phone_number = request_data.phone_number;
        }

        var selectUserQueryIfExists = "SELECT * FROM tbl_user WHERE email_id = ? OR phone_number = ?";

        try{
            const [info] = await database.query(selectUserQueryIfExists, [request_data.email_id, request_data.phone_number]);
            console.log("info: ", info);
            if(info.length > 0){
                var user_data_ = info[0];
                console.log("user_data_: ", user_data_);
                if(info.length > 1){
                    var insertUserQuery = "UPDATE tbl_user SET is_deleted = 1 where user_id = ?";
                    database.query(insertUserQuery, info[1].user_id, (error, status)=>{});
                }
                common.updateUserInfo(user_data_.user_id, user_data, (error, updateUser)=>{
                        if(error){
                            return callback({
                                code: response_code.OPERATION_FAILED,
                                message: error
                            });
                        }
                        else{
                            return callback({
                                code: response_code.SUCCESS,
                                message: "UserSignedIN",
                                data: updateUser
                            });
                        }
                    });                   

            } else{
                var insertUserQuery = "INSERT INTO tbl_user SET ?";

                try{

                    const [status] = await database.query(insertUserQuery, user_data)
                    common.getUserDetail(status.insertId, status.insertId, (err, userInfo)=>{
                        if(err){
                            return callback({
                                code: response_code.OPERATION_FAILED,
                                message: err
                            });
                        }
                        else{
                            return callback({
                                code: response_code.SUCCESS,
                                message: `${"User Signed Up Successfully"}`,
                                data: userInfo
                            });

                        }
                    });

                }catch(error){
                    return callback({
                        code: response_code.OPERATION_FAILED,
                        message: error.sqlMessage | "SOME ERROR"
                    });

                }

                // database.query(insertUserQuery, user_data, (error, status)=>{
                //     if(error){
                //         callback({
                //             code: response_code.OPERATION_FAILED,
                //             message: error.sqlMessage | "SOME ERROR"
                //         });
                //     }
                //     else{
                //         common.getUserDetail(status.insertId, status.insertId, (err, userInfo)=>{
                //             if(err){
                //                 callback({
                //                     code: response_code.OPERATION_FAILED,
                //                     message: err
                //                 });
                //             }
                //             else{
                //                 callback({
                //                     code: response_code.SUCCESS,
                //                     message: `${"User Signed Up Successfully"}`,
                //                     data: userInfo
                //                 });

                //             }
                //         });
                //     }
                // });
            }

        }catch(error){
            console.log("Some error at outer catch");
            const message = {
                code: response_code.OPERATION_FAILED,
                message: error
            }
            return callback(message);
        }


        // database.query(selectUserQueryIfExists, [request_data.email_id, request_data.phone_number], (error, info)=>{
        //     if(error){
        //         const message = {
        //             code: response_code.OPERATION_FAILED,
        //             message: error
        //         }
        //         callback(message);
        //     } else{
        //         if(info.length > 0){
        //             var user_data_ = info[0];

        //             if(info.length > 1){
        //                 var insertUserQuery = "UPDATE tbl_user SET is_deleted = 1 where user_id = ?";
        //                 database.query(insertUserQuery, info[1].user_id, (error, status)=>{});
        //             }

                    // common.updateUserInfo(user_data_.user_id, user_data, (error, updateUser)=>{
                    //     if(error){
                    //         callback({
                    //             code: response_code.OPERATION_FAILED,
                    //             message: error
                    //         });
                    //     }
                    //     else{
                    //         callback({
                    //             code: response_code.SUCCESS,
                    //             message: "UserSignedIN",
                    //             data: updateUser
                    //         });
                    //     }
                    // });                   

        //         } else{
        //             var insertUserQuery = "INSERT INTO tbl_user SET ?";
        //             database.query(insertUserQuery, user_data, (error, status)=>{
        //                 if(error){
        //                     callback({
        //                         code: response_code.OPERATION_FAILED,
        //                         message: error.sqlMessage
        //                     });
        //                 }
        //                 else{
        //                     common.getUserDetail(status.insertId, status.insertId, (err, userInfo)=>{
        //                         if(err){
        //                             callback({
        //                                 code: response_code.OPERATION_FAILED,
        //                                 message: err
        //                             });
        //                         }
        //                         else{
        //                             callback({
        //                                 code: response_code.SUCCESS,
        //                                 message: `${"User Signed Up Successfully"}`,
        //                                 data: userInfo
        //                             });

        //                         }
        //                     });
        //                 }
        //             });
        //         }
        //     }
        // });

    }


    async login(request_data, callback){
        const user_data = {};
        if(request_data.email_id != undefined && request_data.email_id != ""){
            user_data.email_id = request_data.email_id;
        }
        if(request_data.passwords != undefined){
            user_data.passwords = md5(request_data.passwords);
        }

        console.log(user_data);
        var selectUserWithCred = "SELECT * FROM tbl_user WHERE email_id = ? and passwords = ?";
        try{
            const [status] = await database.query(selectUserWithCred, [user_data.email_id, user_data.passwords]);

            console.log(status);

            if (status.length === 0) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "No User Found"
                });
            }

            const user_id = status[0].user_id;
            common.getUserDetail(user_id, user_id, (err, userInfo)=>{
                if(err){
                    return callback({
                        code: response_code.OPERATION_FAILED,
                        message: err
                    });
                }
                else{
                    return callback({
                        code: response_code.SUCCESS,
                        message: "User Signed in Successfully",
                        data: userInfo
                    });

                }
            });


        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage | "SOME ERROR IN LOGIN"
            });
        }

    }
}

module.exports = new userModel();