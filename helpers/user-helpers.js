var db = require('../config/connection')
var collection = require('../config/collection')
var objectId = require('mongodb').ObjectID
const bcrypt = require('bcrypt')
const { response } = require('../app')
const { UserBindingInstance } = require('twilio/lib/rest/ipMessaging/v2/service/user/userBinding')
const Razorpay = require('razorpay')
const { resolve } = require('path')
require('dotenv').config()
var instance = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
});


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let emailExist = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            let mobileExist = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile1: userData.mobile1 })
            if (emailExist) {
                resolve({ emailExist })
            } else if (mobileExist) {
                resolve({ mobileExist })
            } else {
                let userDetails = {}
                userData.password = await bcrypt.hash(userData.password, 10)
                userDetails.first_name = userData.first_name
                userDetails.last_name = userData.last_name
                userDetails.email = userData.email
                userDetails.mobile1 = "+91"+userData.mobile1
                userDetails.password = userData.password
                userDetails.block = userData.block = false
                db.get().collection(collection.USER_COLLECTION).insertOne(userDetails).then((data) => {
                    resolve({data:data.ops[0],status:true})
                })
            }
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        if (user.block) {
                            response.block = true
                            resolve(response)
                        } else {
                            response.user = user
                            response.status = true
                            resolve(response)
                        }
                    } else {
                        resolve({ status: false })
                    }
                })
            } else {
                resolve({ status: false })
            }
        })
    },
    addToCart: (productId, userId) => {
        let proObj = {
            item: objectId(productId),
            proquantity: 1,
        }

        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex((product) => product.item == productId)
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(productId) },
                        {
                            $inc: { 'products.$.proquantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                    db.get().collection(collection.CART_COLLECTION).updateOne({user : objectId(userId)},
                        {
                            $set:{
                                status:status=false
                            }
                        })
                } else {
                   
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }).then((response) => {
                            resolve()
                        })
                     db.get().collection(collection.CART_COLLECTION).updateOne({user : objectId(userId)},
                        {
                            $set:{
                                status:status=false
                            }
                        })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj],
                    status:false
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                }, {
                    $project: {
                        item: '$products.item',
                        proquantity: '$products.proquantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: 1,
                        proquantity: 1,
                        products:1,
                        product:1,
                        total: { $multiply: ['$proquantity', '$product.price'] }
                    }
                }

            ]).toArray()
            resolve(cartItems)

        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
                resolve(count)
            }else{
                resolve()
            }
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.proquantity = parseInt(details.proquantity)
        return new Promise(async (resolve, reject) => {
            if (details.count == -1 && details.proquantity == 1) {
                await db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }).then((response) => {
                        resolve({ remove: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.proquantity': details.count }
                    }).then(() => {
                        resolve({ status: true })
                    })
                db.get().collection(collection.CART_COLLECTION).updateOne({user : objectId(details.user)},
                        {
                            $set:{
                                status:status=false
                            }
                        })
            }
        })
    },
    deleteProductFromCart: (cart,product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(cart) },
                {
                    $pull: {
                        products: { item: objectId(product) }
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        proquantity: '$products.proquantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1,
                        proquantity: 1,
                        products: { $arrayElemAt: ['$products', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$proquantity', '$products.price'] } }
                    }
                }
            ]).toArray()
            if(total.length>0){   
                if(total[0].total) {
                    resolve(total[0].total) 
                }
                
            }else{
                resolve({total:false})
            }
           
        })
    },
    getCartDetails:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let userCart =await db.get().collection(collection.CART_COLLECTION).findOne({ user : objectId(userId) })
           resolve(userCart)
        })
    },
    placeOrder: (order, products) => {

        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj={}
            if(order.save){
             orderObj = {
                deliveryDetails: {
                    first_name: order.first_name,
                    last_name: order.last_name,
                    email: order.email,
                    mobile: order.number,
                    state: order.state,
                    district: order.district,
                    addressline1: order.address1,
                    addressline2: order.address2,
                    post: order.post,
                    country: order.country,
                    save: order.save
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount:order.total,
                status: status,
                cancel:false,
                shipped:false,
                delivered:false,
                date: new Date()
                
            }
        }else{
                 orderObj = {
                    deliveryDetails: {
                        first_name: order.first_name,
                        last_name: order.last_name,
                        email: order.email,
                        mobile: order.number,
                        state: order.state_name,
                        district: order.district,
                        addressline1: order.address1,
                        addressline2: order.address2,
                        post: order.post,
                        country: order.country
                    },
                    userId: objectId(order.userId),
                    paymentMethod: order['payment-method'],
                    products: products,
                    totalAmount: order.total,
                    status: status,
                    cancel:false,
                    shipped:false,
                    delivered:false,
                    date: new Date()
            }
        }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                let address = {}
                address.details = orderObj.deliveryDetails
                address.user = orderObj.userId
                console.log(address.details.save);
                if(address.details.save){
                db.get().collection(collection.ADDRESS_COLLECTION).insertOne(address)
                }
                db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectId(order.userId) })
                resolve(response.ops[0])
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    getUserAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ADDRESS_COLLECTION).find({ user: objectId(userId) }).toArray()
            resolve(order)
        })
    },
    getUserProfile: (userId) => {
        return new Promise(async (resolve, reject) => {
            let userProfile = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            resolve(userProfile)
        })

    },
    updateProfile: (userID, userProfile) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userID) },
                {
                    $set: {
                        first_name: userProfile.first_name,
                        last_name: userProfile.last_name,
                        mobile1: userProfile.mobile1,
                        mobile2: userProfile.mobile2,
                        email: userProfile.email,
                        district: userProfile.district,
                        state: userProfile.state,
                        country: userProfile.country
                    }
                }).then(() => {
                    resolve()
                })
        })
    },
    getUserDetails: (mobile) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile1: mobile })
            resolve(user)
        })
    },
    changePassword: (password, userId) => {
        let oldpassword = password.old
        let newPassword = password.new
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            bcrypt.compare(oldpassword, user.password).then(async (status) => {
                if (status) {
                    newpassword = await bcrypt.hash(newPassword, 10)
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) },
                        {
                            $set: {
                                password: newpassword
                            }
                        }).then(() => {
                            resolve({ status: true })
                        })
                } else {
                    resolve({ status: false })
                }
            })

        })

    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        console.log(orderId);
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        proquantity: '$products.proquantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        proquantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(products)
        })
    },
    generateRazorpay: (data, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+data._id
            };
            instance.orders.create(options, function (err, order) {
                order.paymentMethod="razorpay",
                order.user=data.deliveryDetails.first_name+' '+data.deliveryDetails.last_name,              
                order.email=data.deliveryDetails.email,
                order.mobile=data.deliveryDetails.mobile

                if (err) {
                    console.log(err);
                } else {
                    resolve(order)
                }
            });
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    cancelOrder:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'cancelled',
                    cancel:cancel=true
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    checkCoupon:(coupon,userId)=>{
        return new Promise(async(resolve,reject)=>{
         let ticket = await db.get().collection(collection.COUPON_COLLECTION).findOne({'couponcode':coupon.coupon})
         if(ticket){
             if(ticket.status){
                 let total= parseInt((1-(ticket.offer/100))*coupon.total)
                 db.get().collection(collection.CART_COLLECTION).updateOne({user : objectId(userId)},
                 {
                     $set:{
                         totalAmount:parseInt(total),
                         status:status=true
                     }
                 })
                 resolve(total)
             }else{
                 resolve({expired:true})
             }
         }else{
             resolve({notexist:true})
         }
        })
    },
    getCartAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user : objectId(userId)})
            console.log(cart.totalAmount);
            resolve(cart.totalAmount)
        })
    },
    updateDP: (userID, userProfile) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userID) },
                {
                    $set: {
                        first_name: userProfile.first_name,
                        last_name: userProfile.last_name,
                        mobile1: userProfile.mobile1,
                        mobile2: userProfile.mobile2,
                        email: userProfile.email,
                        district: userProfile.district,
                        state: userProfile.state,
                        country: userProfile.country,
                        status:true
                    }
                }).then(() => {
                    resolve()
                })
        })
    },

}