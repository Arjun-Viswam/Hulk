var db = require('../config/connection')
var collection=require('../config/collection')
var objectId=require('mongodb').ObjectID
var bcrypt=require('bcrypt')
const { response } = require('express')
module.exports = {

    addProduct: (products) => {
        return new Promise((resolve,reject)=>{
        let product={}
        product.product=products.product
        product.price = parseInt(products.price)
        product.quantity=parseInt(products.quantity)
        product.flavour=products.flavour
        product.offer=''
        db.get().collection('product').insertOne(product).then((data) => {
        resolve(data.ops[0]._id)           
        })
    })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products= await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    getRandomProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products= await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([{ $sample :{size :8}}]).toArray()
            resolve(products)
        })
    },
    deleteProduct:(productID)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(productID)}).then((response)=>{
                resolve(response)

            })
        })
    },
    getProductDetails:(productID)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(productID)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(productID,productDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(productID)},
            {$set:{
                product:productDetails.product,
                quantity:parseInt(productDetails.quantity),
                price:parseInt(productDetails.price),
                flavour:productDetails.flavour
            }}).then((response)=>{
                resolve()
            })
        })
    },
    
    adminlogin:async()=>{
        let b ={adminEmail:"arjunviswam82@gmail.com",password:"123456"}        
        b.password=await bcrypt.hash(b.password,10)
         let a=  db.get().collection(collection.ADMIN_LOGIN).insertOne(b)       
    },
    doLogin:(data)=>{
        return new Promise(async(resolve,reject)=>{
            let loginstatus=false
            let response={}
            let admin=await db.get().collection(collection.ADMIN_LOGIN).findOne({adminEmail:data.email})
            if(admin){
                bcrypt.compare(data.password,admin.password).then((status)=>{
                    if(status){
                    response.admin=admin
                    response.status=true
                    resolve(response)
                }else{
                    resolve({status:false})
                }
                })
            }else{
                resolve({status:false})
            }
        })

    },
    getAllUsers:()=>{
        return new Promise(async(resolve,reject)=>{
            let users= await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
    blockUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
            {$set:{
                block:block=true
            }}).then((response)=>{
                resolve()
            })
        })
    },
    unblockUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
            {$set:{
                block:block=false
            }}).then((response)=>{  
                resolve()
            })
        })
    },
    getOrderDetails:()=>{
        return new Promise(async(resolve,reject)=>{
            let orders= await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(orders)
        })
    },
    changeStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'Shipped',
                    shipped:shipped=true
                }
            }).then(()=>{
                resolve({status:true})
            })
        })
    },
    changeStatusDelivered:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'Delivered',
                    delivered:true
                }
            }).then(()=>{
                resolve({status:true})
            })
        })
    },
    insertCoupon:(coupons)=>{
        return new Promise((resolve,reject)=>{
            coupons.offer=parseInt(coupons.offer)
            coupons.status=true
            db.get().collection(collection.COUPON_COLLECTION).insertOne(coupons).then(()=>{
                resolve({status:true})
            })
        })
    },
    availableCoupons:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).find().toArray().then((data)=>{
                resolve(data)
            })
        })
    },
    activateCoupon:(couponId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).updateOne({_id:objectId(couponId)},
            {$set:{
                status:status=true
            }}).then(()=>{
                resolve()
            })
        })
    },
    deactivateCoupon:(couponId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).updateOne({_id:objectId(couponId)},
            {$set:{
                status:status=false
            }}).then(()=>{
                resolve()
            })
        })
    },
    updateOffer:(id,offerDetails)=>{
        return new Promise(async(resolve,reject)=>{
            if(offerDetails.offer<100){
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(id)},
            {
                $set:{ 
                    offer : parseInt(offerDetails.offer),
                    newprice : parseInt( offerDetails.price),
                    price : parseInt( (1-(offerDetails.offer/100))*offerDetails.price ) 
                }
            }).then(()=>{
                resolve()
            })
          }
        })
    },
    deleteProductOffer:(productId,price)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id: objectId(productId)},
            {
                $set:{ price :parseInt(price) }
            })
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id: objectId(productId)},
            {
                $unset:{offer:1}
            })
            resolve()
        })
    },
     getSalesReport:(date)=>{
        return new Promise(async(resolve,reject)=>{
            let report = await db.get().collection(collection.ORDER_COLLECTION).find({date:{$gte:new Date(date.fromDate+ " 00:00:00.000Z"),$lt:new Date(date.toDate+ " 23:59:00.000Z")}}).toArray()
           resolve(report)
        })
    },
    getPlacedOrder:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({ status : 'placed'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getShippedOrder:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({ status :'Shipped'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getDeliveredOrder:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({ status :'Delivered'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getCancelledOrder:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({ status : 'cancel'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getProductsLength:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).find().toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getUserLength:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).find().toArray().then((users)=>{
                resolve(users.length)
            })
        })
    },
    getTotalAmount:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).aggregate({ $match:{amount:true}},
            {
                $project : {totalAmount}
            }
        ).toArray().then((order)=>{
                console.log(order);
            })
        })
    },
    getRazorpayPaid:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({paymentMethod: 'Razorpay'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getCodPaid:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({ paymentMethod : 'COD'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getPaypalPaid:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find({ paymentMethod : 'paypal'}).toArray().then((products)=>{
                resolve(products.length)
            })
        })
    },
    getOrderNumber:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((orders)=>{
                resolve(orders.length)
            })
        })
    },
    deleteCoupon:(id)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).removeOne({_id:objectId(id)}).then(()=>{
                resolve()
            })
        })
    },
    getCoupon:(id)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).findOne({_id:objectId(id)}).then((coupon)=>{
                resolve(coupon)

            })
        })
    },
    updateCoupon:(id,data)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).updateOne({_id:objectId(id)},{
                $set:{
                    couponcode:data.couponcode,
                    offer:data.offer
                }
            }).then((coupon)=>{
                resolve(coupon)
            })
        })
    }
}