module.exports={
    PRODUCT_COLLECTION:'product',
    USER_COLLECTION:'user',
    ADMIN_LOGIN:'admindata',
    CART_COLLECTION:'cart',
    ORDER_COLLECTION:'order',
    ADDRESS_COLLECTION:'useraddress',
    COUPON_COLLECTION:'coupon',
    accountSid : process.env.TWILIO_ACCOUNT_SID,
    authToken : process.env.TWILIO_AUTH_TOKEN,
    serviceId : process.env.TWILIO_SERVICE_ID,
    keySecret : process.env.RAZORPAY_KEY_SECRET,
    keyId : process.env.RAZORPAY_KEY_ID
}
