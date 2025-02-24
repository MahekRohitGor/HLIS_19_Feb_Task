const common = require("../../../../utilities/common");
const database = require("../../../../config/database");
const response_code = require("../../../../utilities/response-error-code");
const md5 = require("md5");

class userModel{
    async signup(request_data, callback) {
        try {
            console.log(request_data);
    
            // Validate required fields
            if (!request_data.email_id || !request_data.device_type) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Missing required fields"
                });
            }
    
            // Initialize user data with required fields
            const user_data = {
                email_id: request_data.email_id,
                login_type: request_data.login_type || "S" // Default to 'S' if not provided
            };
    
            // Add optional fields if they exist
            const optionalFields = ['user_name', 'fname', 'lname', 'phone_number', 'social_id', 'latitude', 'longitude'];
            optionalFields.forEach(field => {
                if (request_data[field]) {
                    user_data[field] = request_data[field];
                }
            });
    
            if (request_data.passwords) {
                user_data.passwords = md5(request_data.passwords);
            }
    
            // Prepare device data
            const device_data = {
                device_type: request_data.device_type,
                device_token: request_data.device_token,
                os_version: request_data.os_version,
                app_version: request_data.app_version,
                time_zone: request_data.time_zone // Add time_zone to match INSERT query
            };
    
            // Determine query based on login type
            const selectUserQueryIfExists = user_data.login_type === "S"
                ? "SELECT * FROM tbl_user WHERE email_id = ? OR phone_number = ?"
                : "SELECT * FROM tbl_user WHERE email_id = ? OR social_id = ?";
    
            const params = user_data.login_type === "S"
                ? [user_data.email_id, user_data.phone_number || null]
                : [user_data.email_id, user_data.social_id];
    
            // Check if user exists
            const [existingUsers] = await database.query(selectUserQueryIfExists, params);
    
            if (existingUsers.length > 0) {
                // Handle existing user
                const user_data_ = existingUsers[0];
    
                if (existingUsers.length > 1) {
                    await database.query(
                        "UPDATE tbl_user SET is_deleted = 1 WHERE user_id = ?",
                        [existingUsers[1].user_id]
                    );
                }
    
                const otp_obj = request_data.otp ? { otp: request_data.otp } : {};
                
                common.updateUserInfo(user_data_.user_id, otp_obj, (error, updateUser) => {
                    if (error) {
                        return callback({
                            code: response_code.OPERATION_FAILED,
                            message: error
                        });
                    }
                    return callback({
                        code: response_code.SUCCESS,
                        message: "User Signed up",
                        data: updateUser
                    });
                });
            } else {
                // Handle new user
                if (!user_data.social_id && user_data.login_type === "S") {
                    // Regular signup - proceed directly
                } else {
                    // Social signup - verify social account
                    const [socialResult] = await database.query(
                        "SELECT * FROM tbl_socials WHERE email = ? AND social_id = ?",
                        [user_data.email_id, user_data.social_id]
                    );
    
                    if (!socialResult.length) {
                        return callback({
                            code: response_code.OPERATION_FAILED,
                            message: "Social ID and email combination not found in tbl_socials"
                        });
                    }
                }
    
                // Insert new user
                const [insertResult] = await database.query("INSERT INTO tbl_user SET ?", user_data);
                const userId = insertResult.insertId;
    
                await this.enterOtp(userId);
    
                // Insert device info
                await database.query(
                    "INSERT INTO tbl_device_info (device_type, time_zone, device_token, os_version, app_version, user_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [device_data.device_type, device_data.time_zone, device_data.device_token, device_data.os_version, device_data.app_version, userId]
                );
    
                // Get user details
                common.getUserDetail(userId, userId, async (err, userInfo) => {
                    try {
                        if (err) {
                            return callback({
                                code: response_code.OPERATION_FAILED,
                                message: err
                            });
                        }
        
                        if (userInfo.is_profile_complete == 1) {
                            // Generate tokens
                            const userToken = common.generateToken(40);
                            const deviceToken = common.generateToken(40);
        
                            // Update both tokens in database
                            await Promise.all([
                                database.query(
                                    "UPDATE tbl_user SET token = ? WHERE user_id = ?",
                                    [userToken, userId]
                                ),
                                database.query(
                                    "UPDATE tbl_device_info SET device_token = ? WHERE user_id = ?",
                                    [deviceToken, userId]
                                )
                            ]);
        
                            // Update userInfo with new token before sending response
                            userInfo.token = userToken;
                            userInfo.device_token = deviceToken;
        
                            return callback({
                                code: response_code.SUCCESS,
                                message: "User Signed Up Successfully... Verification Pending",
                                data: userInfo
                            });
                        } else {
                            return callback({
                                code: response_code.SUCCESS,
                                message: "User Signed Up Successfully... Verification and Profile Completion is Pending",
                                data: userInfo
                            });
                        }
                    } catch (tokenError) {
                        console.error("Token update error:", tokenError);
                        return callback({
                            code: response_code.OPERATION_FAILED,
                            message: "Error updating tokens"
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Signup error:", error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || error.message || "An error occurred during signup"
            });
        }
    }


    async login(request_data, callback){
        const user_data = {};
        if(request_data.email_id != undefined && request_data.email_id != ""){
            user_data.email_id = request_data.email_id;
        }
        if(request_data.passwords != undefined){
            user_data.passwords = md5(request_data.passwords);
        }
        if(request_data.social_id != undefined && request_data.social_id != ""){
            user_data.social_id = request_data.social_id;
        }
        // if(request_data.latitude != undefined && request_data.latitude != ""){
        //     user_data.latitude = request_data.latitude;
        // }
        // if(request_data.longitude != undefined && request_data.longitude != ""){
        //     user_data.longitude = request_data.longitude;
        // }

        var selectUserWithCred;
        var params;

        if (request_data.login_type == "S") {
            selectUserWithCred = "SELECT * FROM tbl_user WHERE email_id = ? AND passwords = ?";
            params = [user_data.email_id, user_data.passwords];
        } else if (user_data.social_id)  {
            selectUserWithCred = `
                SELECT u.* FROM tbl_user u 
                INNER JOIN tbl_socials s ON u.social_id = s.social_id 
                WHERE s.social_id = ? AND u.email_id = ?`;
            params = [user_data.social_id, user_data.email_id];
        } else{
            return callback({
                code: response_code.INVALID_REQUEST,
                message: "Invalid login type or missing social_id"
            });
        }

        console.log(user_data);
        // var selectUserWithCred = "SELECT * FROM tbl_user WHERE email_id = ? and passwords = ?";
        try{
            const [status] = await database.query(selectUserWithCred, params);

            console.log("Status: ", status);

            if (status.length === 0) {
                console.log(status.length);
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "No User Found"
                });
            }

            const user_id = status[0].user_id;

            const token = common.generateToken(40);
            // console.log(token);
            const updateTokenQuery = "UPDATE tbl_user SET token = ?, is_login = 1 WHERE user_id = ?";
            await database.query(updateTokenQuery, [token, user_id]);

            const device_token = common.generateToken(40);
            const updateDeviceToken = "UPDATE tbl_device_info SET device_token = ? WHERE user_id = ?";
            await database.query(updateDeviceToken, [device_token, user_id]);

            if (request_data.latitude && request_data.longitude) {
                const updateLocationQuery = "UPDATE tbl_user SET latitude = ?, longitude = ? WHERE user_id = ?";
                await database.query(updateLocationQuery, [request_data.latitude, request_data.longitude, user_id]);
            }

            common.getUserDetailLogin(user_id, request_data.login_type, (err, userInfo)=>{
                if(err){
                    return callback({
                        code: response_code.OPERATION_FAILED,
                        message: err
                    });
                }
                else{
                    userInfo.token = token;
                    userInfo.device_token = device_token;
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

    async enterOtp(user_id){
        const otp = common.generateOtp(4);
        const insertOtpQuery = "INSERT INTO tbl_otp (user_id, otp) VALUES (?, ?)";
        await database.query(insertOtpQuery, [user_id, otp]);
        console.log("OTP sent to user_id:", user_id, "OTP:", otp);
    }

    async verify(request_data, callback){
        const { user_id, otp } = request_data;
        var verifyOtpQuery = "UPDATE tbl_user u INNER JOIN tbl_otp o ON u.user_id = o.user_id SET u.is_verify = 1 WHERE u.user_id = ? AND o.otp = ?";
        try {
            const [result] = await database.query(verifyOtpQuery, [user_id, otp]);
            if (result.affectedRows > 0) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "User verified successfully"
                });
            } else {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Invalid OTP or user not found"
                });
            }
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error verifying OTP"
            });
        }
    }

    async logout(request_data, callback) {
        const user_id = request_data.user_id;

        var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required for logout"
                });
            }
    
        // Validate user_id
        if (!user_id) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "User ID is required"
            });
        }
    
        try {
            // First check if user exists
            const userExistsQuery = "SELECT user_id FROM tbl_user WHERE user_id = ?";
            const [user] = await database.query(userExistsQuery, [user_id]);
    
            if (!user || !user.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found"
                });
            }
    
            // Update queries
            const updateDeviceTokenQuery = "UPDATE tbl_device_info SET device_token = '', updated_at = NOW() WHERE user_id = ?";
            const updateTokenQuery = "UPDATE tbl_user SET token = '', is_login = 0 WHERE user_id = ?";
    
            // Execute both updates in parallel since they're independent
            await Promise.all([
                database.query(updateDeviceTokenQuery, [user_id]),
                database.query(updateTokenQuery, [user_id])
            ]);
    
            // Get updated user info for response
            const getUserQuery = "SELECT user_id, user_name, email_id FROM tbl_user WHERE user_id = ?";
            const [updatedUser] = await database.query(getUserQuery, [user_id]);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Logout successful",
                data: updatedUser[0]
            });
    
        } catch (error) {
            console.error('Logout Error:', error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Failed to logout. Please try again.",
                error: error.message
            });
        }
    }

    async forgot_password(requested_data, callback) {
        const { email_id } = requested_data;
        
        if (!email_id) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Email ID is required"
            });
        }
        
        try {
            // Check if the user exists
            const userQuery = "SELECT * FROM tbl_user WHERE email_id = ?";
            const [user] = await database.query(userQuery, [email_id]);
            
            if (!user.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found"
                });
            }
            
            // Generate reset token
            const reset_token = common.generateToken(40);
            const expires_at = new Date(Date.now() + 3600000); // 1-hour expiry
            
            // Insert reset token into tbl_forgot_password
            const insertTokenQuery = `INSERT INTO tbl_forgot_password (email_id, reset_token, expires_at) VALUES (?, ?, ?)`;
            await database.query(insertTokenQuery, [email_id, reset_token, expires_at]);

            // Send an Email for a password reset link
            
            return callback({
                code: response_code.SUCCESS,
                message: "Password reset token sent successfully"
            });
            
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error in forgot password process"
            });
        }
    }

    async reset_password(requested_data, callback) {
        const { reset_token, new_password } = requested_data;
    
        if (!reset_token || !new_password) {
            return callback({
                code: response_code.INVALID_REQUEST,
                message: "Reset token and new password are required"
            });
        }
    
        try {
            const selectTokenQuery = `
                SELECT email_id FROM tbl_forgot_password 
                WHERE reset_token = ? AND is_active = 1 AND expires_at > NOW()
            `;
    
            const [result] = await database.query(selectTokenQuery, [reset_token]);
    
            if (!result.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Invalid or expired reset token"
                });
            }
    
            const email_id = result[0].email_id;
            const hashedPassword = md5(new_password);
    
            const updatePasswordQuery = "UPDATE tbl_user SET passwords = ? WHERE email_id = ?";
            await database.query(updatePasswordQuery, [hashedPassword, email_id]);
    
            const deactivateTokenQuery = "UPDATE tbl_forgot_password SET is_active = 0 WHERE reset_token = ?";
            await database.query(deactivateTokenQuery, [reset_token]);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Password reset successfully"
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error resetting password"
            });
        }
    }    
    
    async complete_profile(requested_data, callback) {
        try {
            const { user_id, about, profile_pic } = requested_data;
    
            const userFetchQuery = "SELECT is_profile_complete FROM tbl_user WHERE user_id = ?";
            const [result] = await database.query(userFetchQuery, [user_id]);
    
            if (result.length === 0) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found",
                });
            }
    
            // If profile is already complete
            if (result[0].is_profile_complete === 1) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "Profile is already complete",
                });
            }
    
            // Update user profile details
            const updateProfileQuery = `
                UPDATE tbl_user 
                SET about = ?, profile_pic = ?, is_profile_complete = 1
                WHERE user_id = ?`;
            
            await database.query(updateProfileQuery, [about, profile_pic, user_id]);
    
            // Fetch updated user details
            const fetchUpdatedUserQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [updatedUser] = await database.query(fetchUpdatedUserQuery, [user_id]);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Profile completed successfully",
                data: updatedUser[0],
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error updating profile",
            });
        }
    }
    
    async changePassword(request_data, callback) {
        const user_id = request_data.user_id

        var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }
        
        var selectQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
        
        try {
            const [rows] = await database.query(selectQuery, [user_id]);
            
            if (!rows || rows.length === 0) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found"
                });
            }
    
            const user = rows[0];
    
            if (!user.passwords) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Social login password can't be changed"
                });
            }
    
            const oldPasswordHash = md5(request_data.old_password);
            const newPasswordHash = md5(request_data.new_password);

            if (oldPasswordHash !== user.passwords) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Old password does not match"
                });
            }
    
            if (newPasswordHash === user.passwords) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Old password and new password can't be same"
                });
            }
    
            const data = {
                passwords: newPasswordHash
            };
    
            common.updateUserInfoGeneral(user_id, data, (err, result) => {
                if (err) {
                    return callback({
                        code: response_code.OPERATION_FAILED,
                        message: err
                    });
                } else{
                    return callback({
                        code: response_code.SUCCESS,
                        message: "Password changed successfully",
                        data: result
                    });
                }
                
            });
    
        } catch (error) {
            console.error('Change Password Error:', error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.message || "Error changing password"
            });
        }
    }

    async category_listing(request_data, callback){
        const listCategory = `SELECT 
                c.category_id, 
                c.category_name, 
                i.image_name
            FROM tbl_category c
            LEFT JOIN tbl_image i ON c.image_id = i.image_id
            WHERE c.is_active = 1 AND c.is_deleted = 0`;

            try{  
                const [result] = await database.query(listCategory);
                return callback({
                    code: response_code.SUCCESS,
                    message: "Category Listed",
                    data: result
                })
            } catch(error){
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: error.message || "Error Fetching Category Details"
                });
            }
    }

    async add_post(request_data, user_id, callback){ 
        try {

            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }

            if (!user_id) {
                throw new Error("User ID is required");
            }
    
            let category_id = null;
            try {
                if (request_data.category_name) {
                    const [existingCategory] = await database.query(
                        "SELECT category_id FROM tbl_category WHERE category_name = ?",
                        [request_data.category_name]
                    );
    
                    if (existingCategory.length > 0) {
                        category_id = existingCategory[0].category_id;
                    } else {
                        return callback({
                            code: response_code.OPERATION_FAILED,
                            message: "Category name NOT LISTED"
                        });
                    }
                }
    
                const postQuery = `
                    INSERT INTO tbl_post 
                    (user_id, title, descriptions, category_id, latitude, longitude) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const postParams = [
                    user_id,
                    request_data.title,
                    request_data.descriptions,
                    category_id,
                    request_data.latitude || null,
                    request_data.longitude || null
                ];
    
                const [postResult] = await database.query(postQuery, postParams);
                const post_id = postResult.insertId;
                
                const [post_data] = await database.query(
                    `select * from tbl_post where post_id = ?`,
                    [post_id]
                );
    
                return callback({
                    code: response_code.SUCCESS,
                    message: "Post Added Successfully",
                    data: post_data[0]
                });
    
            } catch (error) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: error
                });
            }
    
        } catch (error) {
            console.error('Error in Post:', error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.message || "Failed to add post"
            });
        }

    }

    async add_deal(request_data, user_id, callback){
        try {

            // var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            // const [info] = await database.query(select_user_query, [user_id]);

            // // Check if user is logged in
            // if (!info.length || info[0].is_login === 0) {
            //     return callback({
            //         code: response_code.OPERATION_FAILED,
            //         message: "Login required"
            //     });
            // }

            // if (!user_id) {
            //     throw new Error("User ID is required");
            // }
    
            let image_id = null;
            let category_id = null;
            try {
                if (request_data.image_name) {
                    const [imageResult] = await database.query(
                        "INSERT INTO tbl_image (image_name) VALUES (?)",
                        [request_data.image_name]
                    );
                    image_id = imageResult.insertId;
                }
                if (request_data.category_name) {
                    const [existingCategory] = await database.query(
                        "SELECT category_id FROM tbl_category WHERE category_name = ?",
                        [request_data.category_name]
                    );
    
                    if (existingCategory.length > 0) {
                        category_id = existingCategory[0].category_id;
                    } else {
                        return callback({
                            code: response_code.OPERATION_FAILED,
                            message: "Category name NOT LISTED"
                        });
                    }
                }
    
                const dealQuery = `
                    INSERT INTO tbl_deal 
                    (user_id, title, descriptions, website_url, category_id, latitude, longitude, image_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const dealParams = [
                    user_id,
                    request_data.title,
                    request_data.descriptions,
                    request_data.website_url || null,
                    category_id,
                    request_data.latitude || null,
                    request_data.longitude || null,
                    image_id
                ];
    
                const [dealResult] = await database.query(dealQuery, dealParams);
                const deal_id = dealResult.insertId;
    
                if (request_data.tags && Array.isArray(request_data.tags) && request_data.tags.length > 0) {
                    for (const tag of request_data.tags) {
                        if (typeof tag !== 'string') continue;
                        
                        const [existingTags] = await database.query(
                            "SELECT tag_id FROM tbl_tags WHERE tags = ?",
                            [tag.trim()]
                        );
    
                        let tag_id;
                        if (existingTags.length > 0) {
                            tag_id = existingTags[0].tag_id;
                            await database.query(
                                "UPDATE tbl_tags SET tags_cnt = tags_cnt + 1 WHERE tag_id = ?",
                                [tag_id]
                            );
                        } else {
                            const [newTag] = await database.query(
                                "INSERT INTO tbl_tags (tags, tags_cnt) VALUES (?, 1)",
                                [tag.trim()]
                            );
                            tag_id = newTag.insertId;
                        }
    
                        // Link tag to deal
                        await database.query(
                            "INSERT INTO tbl_deal_tag (deal_id, tag_id) VALUES (?, ?)",
                            [deal_id, tag_id]
                        );
                    }
                }
    
                
                const [dealData] = await database.query(
                    `SELECT d.*, GROUP_CONCAT(t.tags) as tags 
                     FROM tbl_deal d 
                     LEFT JOIN tbl_deal_tag dt ON d.deal_id = dt.deal_id 
                     LEFT JOIN tbl_tags t ON dt.tag_id = t.tag_id 
                     WHERE d.deal_id = ?
                     GROUP BY d.deal_id`,
                    [deal_id]
                );
    
                return callback({
                    code: response_code.SUCCESS,
                    message: "Deal Added Successfully",
                    data: dealData[0]
                });
    
            } catch (error) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: error
                });
            }
    
        } catch (error) {
            console.error('Error in add_deal:', error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.message || "Failed to add deal"
            });
        }
    }


    async deal_listing_main(requested_data, user_id, callback){
        
        try{

            const findLocUserQuery = "SELECT latitude, longitude from tbl_user where user_id = ?";

            const [res] = await database.query(findLocUserQuery, [user_id]);
            console.log(res);
            if(res[0].latitude === null && res[0].longitude === null){
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "No Deals Found in your area. Turn ON Location to find nearest best deals for you"
                });
            }
            const latitude = res[0].latitude;
            const longitude = res[0].longitude;
            console.log(latitude);
            console.log(longitude);

            const query = `
            SELECT 
                d.deal_id,
                d.title,
                d.comment_cnt,
                d.created_at,
                d.latitude,
                d.longitude,
                i.image_name,
                c.category_name,
                d.avg_rating as avgerage_rating,
                COALESCE(r.rating, 0) AS user_rating,
                ROUND(
                        6371 * ACOS(
                            COS(RADIANS(?)) * COS(RADIANS(d.latitude)) 
                            * COS(RADIANS(d.longitude) - RADIANS(?)) 
                            + SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
                        ), 2
                    )
                AS distance_km
            FROM tbl_deal d
            LEFT JOIN tbl_image i ON d.image_id = i.image_id
            LEFT JOIN tbl_category c ON d.category_id = c.category_id
            LEFT JOIN tbl_rating r ON d.deal_id = r.deal_id AND r.user_id = ?
            WHERE d.is_active = 1 AND d.is_deleted = 0
            HAVING distance_km < 100000
            ORDER BY d.created_at DESC;
        `;

            const [results] = await database.query(query, [latitude, longitude, latitude, user_id]);
            console.log(results)
            if(results.length > 0){
                return callback({
                    code: response_code.SUCCESS,
                    message: "Deals listed",
                    data: results
                });
            } else{
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "No Deals Found in your area try changing location"
                });
            }

        } catch(error){
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error Listing Deals for User"
            })
        }
    }

    async deal_detail(request_data, user_id, deal_id ,callback){
        try {
            const query = `
                SELECT 
                d.deal_id,
                i.image_name,
                c.category_name,
                d.descriptions,
                d.website_url,
                u.profile_pic,
                u.user_name,
                d.created_at,
                d.latitude,
                d.longitude,
                GROUP_CONCAT(t.tags) AS tags,
                d.comment_cnt,
                CASE 
                    WHEN r.rating IS NOT NULL THEN 1 
                    ELSE 0 
                END AS user_rated
            FROM tbl_deal d
            LEFT JOIN tbl_image i ON d.image_id = i.image_id
            LEFT JOIN tbl_category c ON d.category_id = c.category_id
            LEFT JOIN tbl_rating r ON d.deal_id = r.deal_id AND r.user_id = ?
            LEFT JOIN tbl_deal_tag dt ON d.deal_id = dt.deal_id AND dt.is_active = 1 AND dt.is_deleted = 0
            LEFT JOIN tbl_tags t ON dt.tag_id = t.tag_id AND t.is_active = 1 AND t.is_deleted = 0
            left join tbl_user u on u.user_id = d.user_id
            WHERE d.deal_id = ? AND d.is_active = 1 AND d.is_deleted = 0
            GROUP BY d.deal_id;
            `;
    
            const [result] = await database.query(query, [user_id, deal_id]);
    
            if (result.length > 0) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "Deal details fetched successfully",
                    data: result[0]
                });
            } else {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Deal not found"
                });
            }
        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error fetching deal details"
            });
        }
    }

    async profile_user_loggedin(request_data, user_id, callback){
        try {
            const query = `
                SELECT 
                    u.user_id,
                    u.user_name,
                    u.latitude,
                    u.longitude,
                    u.about,
                    u.profile_pic AS profile_image,
                    (SELECT COUNT(*) FROM tbl_follow f WHERE f.follow_id = u.user_id AND f.is_active = 1 AND f.is_deleted = 0) AS followers_count,
                    (SELECT COUNT(*) FROM tbl_follow f WHERE f.user_id = u.user_id AND f.is_active = 1 AND f.is_deleted = 0) AS following_count,
                    COALESCE(JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'post_id', p.deal_id,
                            'image', img.image_name
                        )
                    ), JSON_ARRAY()) AS user_posts
                FROM tbl_user u
                LEFT JOIN tbl_deal p ON u.user_id = p.user_id AND p.is_active = 1 AND p.is_deleted = 0
                LEFT JOIN tbl_image img ON p.image_id = img.image_id
                WHERE u.user_id = ? and is_login = 1
                GROUP BY u.user_id;
            `;
    
            const [result] = await database.query(query, [user_id]);
    
            if (result.length > 0) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "User details fetched successfully",
                    data: result[0]
                });
            } else {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found"
                });
            }
        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error fetching user details"
            });
        }
    }

    async profile_user(request_data, user_id, callback){
        try {
            const query = `
                SELECT 
                    u.user_id,
                    u.user_name,
                    u.latitude,
                    u.longitude,
                    u.about,
                    u.profile_pic AS profile_image,
                    count(p.deal_id) as post_cnt,
                    (SELECT COUNT(*) FROM tbl_follow f WHERE f.follow_id = u.user_id AND f.is_active = 1 AND f.is_deleted = 0) AS followers_count,
                    (SELECT COUNT(*) FROM tbl_follow f WHERE f.user_id = u.user_id AND f.is_active = 1 AND f.is_deleted = 0) AS following_count,
                    COALESCE(JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'post_id', p.deal_id,
                            'image', img.image_name
                        )
                    ), JSON_ARRAY()) AS user_posts
                FROM tbl_user u
                LEFT JOIN tbl_deal p ON u.user_id = p.user_id AND p.is_active = 1 AND p.is_deleted = 0
                LEFT JOIN tbl_image img ON p.image_id = img.image_id
                WHERE u.user_id = ?
                GROUP BY u.user_id;
            `;
    
            const [result] = await database.query(query, [user_id]);
    
            if (result.length > 0) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "User details fetched successfully",
                    data: result[0]
                });
            } else {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found"
                });
            }
        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error fetching user details"
            });
        }
    }

    async edit_profile(request_data, user_id, callback) {
        try {
            if (!user_id) {
                return callback({
                    code: response_code.BAD_REQUEST,
                    message: "User ID is required"
                });
            }
    
            const allowedFields = ["user_name", "fname", "lname", "about", "profile_pic"];
            let updateFields = [];
            let values = [];
    
            for (let key of allowedFields) {
                if (request_data[key] !== undefined) {
                    updateFields.push(`${key} = ?`);
                    values.push(request_data[key]);
                }
            }
    
            if (updateFields.length === 0) {
                return callback({
                    code: response_code.NO_CHANGE,
                    message: "No valid fields provided for update"
                });
            }

            updateFields.push("updated_at = CURRENT_TIMESTAMP()");
            values.push(user_id);
    
            const updateQuery = `
                UPDATE tbl_user 
                SET ${updateFields.join(", ")}
                WHERE user_id = ? AND is_active = 1 AND is_deleted = 0 and is_login = 1
            `;
    
            const [result] = await database.query(updateQuery, values);
    
            if (result.affectedRows > 0) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "Profile updated successfully"
                });
            } else {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found or no changes applied"
                });
            }
    
        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error updating profile"
            });
        }
    }
    
    async get_followers(user_id, callback) {
        try {

            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }


            if (!user_id) {
                return callback({
                    code: response_code.BAD_REQUEST,
                    message: "User ID is required"
                });
            }

            const query = `
                SELECT 
                    u.user_id, 
                    u.user_name, 
                    u.profile_pic AS profile_image
                FROM tbl_follow f
                JOIN tbl_user u ON f.user_id = u.user_id
                WHERE f.follow_id = ? AND f.is_active = 1 AND f.is_deleted = 0;
            `;

            const [results] = await database.query(query, [user_id]);

            return callback({
                code: response_code.SUCCESS,
                message: "Followers fetched successfully",
                data: results
            });

        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error fetching followers"
            });
        }
    }

    async get_following(user_id, callback) {
        try {
            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }

            if (!user_id) {
                return callback({
                    code: response_code.BAD_REQUEST,
                    message: "User ID is required"
                });
            }

            const query = `
                SELECT 
                    u.user_id, 
                    u.user_name, 
                    u.profile_pic AS profile_image
                FROM tbl_follow f
                JOIN tbl_user u ON f.follow_id = u.user_id
                WHERE f.user_id = ? AND f.is_active = 1 AND f.is_deleted = 0;
            `;

            const [results] = await database.query(query, [user_id]);

            return callback({
                code: response_code.SUCCESS,
                message: "Following fetched successfully",
                data: results
            });

        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error fetching following"
            });
        }
    }

    async contact_us(request_data, user_id, callback) {
        try {


            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }

            if (!request_data.title || !request_data.email_id || !request_data.message) {
                return callback({
                    code: response_code.BAD_REQUEST,
                    message: "Title, Email ID, and Message are required"
                });
            }
    
            const contact_us = {
                title: request_data.title,
                email_id: request_data.email_id,
                message: request_data.message,
                user_id: user_id
            };
    
            const insertQuery = "INSERT INTO tbl_contact_us SET ?";
    
            const [result] = await database.query(insertQuery, [contact_us]);
    
            if (result.affectedRows > 0) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "Contact request submitted successfully",
                    data: { contact_id: result.insertId }
                });
            } else {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Failed to submit contact request"
                });
            }
    
        } catch (error) {
            console.error("Error in contact_us:", error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error submitting contact request"
            });
        }
    }

    async report(request_data, user_id, callback) {
        try {

            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }

            // Validate required fields
            if (!request_data.problem || !request_data.deal_id) {
                return callback({
                    code: response_code.INVALID_REQUEST,
                    message: "Problem type and deal ID are required"
                });
            }
    
            // Report data
            const report_data = {
                problem: request_data.problem,
                feedback: request_data.feedback || null,
                deal_id: request_data.deal_id,
                reported_by_id: user_id
            };
    
            // Insert report query
            const insertQuery = "INSERT INTO tbl_report SET ?";
            const [result] = await database.query(insertQuery, report_data);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Report submitted successfully",
                data: { report_id: result.insertId }
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error submitting report"
            });
        }
    }

    async comment_deal(request_data, deal_id, user_id, callback){
        try {
            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }

            // Validate required fields
            if (!request_data.comment_text) {
                return callback({
                    code: response_code.INVALID_REQUEST,
                    message: "Comment text required"
                });
            }
    
            const comment_data = {
                comment_text: request_data.comment_text,
                user_id: user_id,
                deal_id: deal_id
            };
    
            const insertQuery = "INSERT INTO tbl_comment_deal SET ?";
            const [result] = await database.query(insertQuery, comment_data);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Comment added successfully",
                data: { comment_id: result.insertId }
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error adding comment"
            });
        }
    }


    async comment_post(request_data, post_id, user_id, callback){
        try {
            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }

            // Validate required fields
            if (!request_data.comment_text) {
                return callback({
                    code: response_code.INVALID_REQUEST,
                    message: "Comment text required"
                });
            }
    
            const comment_data = {
                comment_text: request_data.comment_text,
                user_id: user_id,
                post_id: post_id
            };
    
            const insertQuery = "INSERT INTO tbl_comment_post SET ?";
            const [result] = await database.query(insertQuery, comment_data);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Comment added successfully",
                data: { comment_id: result.insertId }
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error adding comment"
            });
        }
    }

    async delete_account(request_data, user_id, callback) {
        try {

            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [info] = await database.query(select_user_query, [user_id]);

            // Check if user is logged in
            if (!info.length || info[0].is_login === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Login required"
                });
            }
            
            const selectUserQuery = "SELECT * FROM tbl_user WHERE user_id = ? AND is_deleted = 0";
            const [user] = await database.query(selectUserQuery, [user_id]);
    
            if (!user.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "User not found or already deleted"
                });
            }
    
            const deleteUserQuery = "UPDATE tbl_user SET is_deleted = 1, is_active = 0, is_login = 0 WHERE user_id = ?";
            await database.query(deleteUserQuery, [user_id]);
    
            const deleteDealsQuery = "UPDATE tbl_deal SET is_deleted = 1, is_active=0 WHERE user_id = ?";
            await database.query(deleteDealsQuery, [user_id]);
    
            const deleteCommentsQuery = "UPDATE tbl_comment_deal SET is_deleted = 1 WHERE user_id = ?";
            await database.query(deleteCommentsQuery, [user_id]);
    
            const deleteFollowQuery = "UPDATE tbl_follow SET is_deleted = 1 WHERE user_id = ? OR follow_id = ?";
            await database.query(deleteFollowQuery, [user_id, user_id]);
    
            return callback({
                code: response_code.SUCCESS,
                message: "User account deleted successfully"
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error deleting account"
            });
        }
    }

    async saved_deals(request_data, user_id, callback){
        try{
            var savedDealsQuery = `
                            SELECT 
                su.saved_id,
                su.user_id AS saved_by_user_id, 
                user_saved_deal.user_name AS saved_by_user_name,
                d.deal_id, 
                d.title, 
                d.descriptions, 
                d.category_id,
                c.category_name,
                d.created_at,
                d.latitude, 
                d.longitude, 
                d.is_active, 
                d.comment_cnt,
                user_posted_deal.user_id AS posted_by_user_id, 
                user_posted_deal.user_name AS posted_by_user_name,
                CASE 
                    WHEN r.rating IS NOT NULL THEN 1 
                    ELSE 0 
                END AS is_user_rated
            FROM tbl_saved_post_by_user su
            INNER JOIN tbl_deal d ON d.deal_id = su.deal_id
            INNER JOIN tbl_user user_saved_deal ON user_saved_deal.user_id = su.user_id
            INNER JOIN tbl_user user_posted_deal ON user_posted_deal.user_id = d.user_id
            INNER JOIN tbl_category c ON c.category_id = d.category_id
            LEFT JOIN tbl_rating r ON d.deal_id = r.deal_id AND r.user_id = su.user_id
            WHERE su.user_id = ? AND d.is_active = 1 AND d.is_deleted = 0
            AND user_saved_deal.is_active = 1 AND user_saved_deal.is_deleted = 0
            AND user_posted_deal.is_active = 1 AND user_posted_deal.is_deleted = 0 
            AND c.is_active = 1 AND c.is_deleted = 0;
            `;

            const [user] = await database.query(savedDealsQuery, [user_id]);
            if (!user.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "No Saved Deals"
                });
            } else{
                return callback({
                    code: response_code.SUCCESS,
                    message: "Here are the saved deals...",
                    data: user
                });
            }


        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error
            });

        }
    }

    async filter_data(request_data, callback){
        try {
            const { latitude, longitude, category, max_distance } = request_data;
    
            if (!latitude || !longitude || !category || !max_distance) {
                return callback({
                    code: response_code.INVALID_REQUEST,
                    message: "Missing required parameters"
                });
            }
    
            const query = `
                SELECT 
                    d.deal_id, 
                    d.title, 
                    d.description, 
                    d.category, 
                    d.latitude, 
                    d.longitude,
                    (6371 * ACOS(COS(RADIANS(?)) * COS(RADIANS(d.latitude)) 
                    * COS(RADIANS(d.longitude) - RADIANS(?)) + SIN(RADIANS(?)) 
                    * SIN(RADIANS(d.latitude)))) AS distance
                FROM tbl_deal d
                WHERE d.category = ? 
                AND d.is_active = 1 
                AND d.is_deleted = 0 
                HAVING distance <= ?
                ORDER BY distance;
            `;
    
            const params = [latitude, longitude, latitude, category, max_distance];
            const [deals] = await database.query(query, params);
    
            return callback({
                code: response_code.SUCCESS,
                message: "Filtered deals fetched successfully",
                data: deals
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || "Error fetching deals"
            });
        }
    }
    
    

}

module.exports = new userModel();