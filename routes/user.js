const { response } = require("express");
var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
require('dotenv').config()
const otp = require("../config/collection")
let accountSid =  process.env.TWILIO_ACCOUNT_SID
let authToken = process.env.TWILIO_AUTH_TOKEN
const client = require("twilio")(accountSid,authToken)

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  let users = req.session.user;
  let total = {};
  if (req.session.user) {
    let prodList = await userHelpers.getCartProducts(req.session.user._id);
    let count = await userHelpers.getCartCount(req.session.user._id);
    if (count) {
      total = await userHelpers.getTotalAmount(req.session.user._id);
    }
    console.log("ssssssssss");
    productHelpers.getRandomProducts().then((products) => {
      res.render("user/user-products", {
        user: true,
        products,
        users,
        dropdown: true,
        prodList,
        count,
        total,
      });
    });
  } else {
    productHelpers.getRandomProducts().then((products) => {
      res.render("user/user-products", {
        user: true,
        products,
        users,
        dropdown: true,
      });
    });
  }
});

router.get("/login", (req, res) => {
  if (req.session.userLoggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", {
      loginErr: req.session.userloginErr,
      block: req.session.userblock,
    });
    req.session.userloginErr = false;
    req.session.userblock = false;
  }
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      console.log(response);
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      if (response.block) {
        req.session.userblock = response.block;
        res.redirect("/login");
      } else {
        req.session.userloginErr = "Invalid username or password";
        res.redirect("/login");
      }
    }
  });
});

router.get("/signup", (req, res) => {
  res.render("user/signup", {
    mobileExist: req.session.mobileExist,
    emailExist: req.session.emailExist,
    Nodata:true
  });
  req.session.emailExist = false;
  req.session.mobileExist = false;
});

router.post("/signup", (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.data;
      console.log(req.session.user);
      res.redirect("/");
    } else if (response.emailExist) {
      req.session.emailExist = response.emailExist;
      res.redirect("/signup");
    } else if (response.mobileExist) {
      req.session.mobileExist = response.mobileExist;
      res.redirect("/signup");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect("/login");
});

router.get("/single/:id", async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render("user/single", { product, singleview: true });
});

router.get("/cart", verifyLogin, async (req, res) => {
  let users = req.session.user; 
  let total = {};
  let prodList = await userHelpers.getCartProducts(req.session.user._id);
  let count = await userHelpers.getCartCount(req.session.user._id);
  if (count) {
    total = await userHelpers.getTotalAmount(req.session.user._id);
    }
  res.render("user/cart", { user: true, users, prodList, count, total });
});

router.get("/add-to-cart/:id", verifyLogin, (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

router.post("/change-product-quantity", (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user);
    res.json(response);
  });
});

router.get("/remove-product-fromCart/:id/:productId", (req, res, next) => {
  userHelpers.deleteProductFromCart(req.params.id,req.params.productId).then(() => {
    res.redirect('/cart')
  });
});

router.get("/profile", verifyLogin, async (req, res) => {
  let profile = await userHelpers.getUserProfile(req.session.user._id);
  res.render("user/profile", { profile ,user:true,users:req.session.user});
});

router.get("/edit-profile/:id", verifyLogin, async (req, res) => {
  let profile = await userHelpers.getUserProfile(req.params.id);
  res.render("user/edit-profile", { profile });
});

router.post("/update-profile/:id", (req, res) => {
  userHelpers.updateProfile(req.params.id, req.body).then(() => {
    if(req.files){
    let image = req.files.image;
    userHelpers.updateDP(req.params.id, req.body)
  image.mv("./public/profile-photos/" + req.params.id + ".jpg");
    }
    res.redirect("/profile/");
  });
});

router.get("/otp-login", (req, res) => {
  res.render("user/otp-login");
});

router.post("/otp-login", async (req, res) => {
  console.log(req.body);
  let user = await userHelpers.getUserDetails(req.body.full);
  if (user != null) {
    let serviceId =  process.env.TWILIO_SERVICE_ID

    client.verify
      .services(serviceId)
      .verifications.create({ to: req.body.full, channel: "sms" })
      .then((verification) => {
        console.log(verification.status);
      });
    id = req.body.full;
    res.render("user/otp-code", { id });
  } else {
    loginErr = "This user does not have an account";
    res.render("user/otp-login", { loginErr });
  }
});

router.post("/otp-code", async (req, res) => {
  let serviceId =  process.env.TWILIO_SERVICE_ID

  client.verify
    .services(serviceId)
    .verificationChecks.create({ to: req.body.id, code: req.body.token })
    .then((verification_check) => {
      if (verification_check.status) {
        userHelpers.getUserDetails(req.body.id).then((user) => {
          req.session.userLoggedIn = true;
          req.session.user = user;
          res.redirect("/");
        });
      }
    });
});

router.get("/password", (req, res) => {
  res.render("user/password", {
    message: req.session.message,
    message1: req.session.message1,
  });
  req.session.message = false;
  req.session.message1 = false;
});

router.post("/password", (req, res) => {
  userHelpers
    .changePassword(req.body, req.session.user._id)
    .then((response) => {
      if (response.status) {
        req.session.message = "password updated successfully";
        res.redirect("/password");
      } else {
        req.session.message1 = "you have entered a wrong password";
        res.redirect("/password");
      }
    });
});

router.get("/myorders/:id", verifyLogin, async (req, res) => {
  let orderId = req.params.id;
  let orders = await userHelpers.getUserOrders(req.session.user._id);
  userHelpers.changePaymentStatus(orderId).then(() => {
    res.render("user/myorders", {
      user: true,
      users: req.session.user,
      orders,
    });
  });
});

router.get("/myorders", verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id);
  res.render("user/myorders", { user: true, users: req.session.user, orders });
});

router.get("/view-order-products/:id", verifyLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id);
  res.render("user/info", { user: true, users: req.session.user, products });
});

router.get("/checkout", verifyLogin, async (req, res) => {
  let total = {};
  let prodList = await userHelpers.getCartProducts(req.session.user._id);
  let count = await userHelpers.getCartCount(req.session.user._id);
  let address = await userHelpers.getUserAddress(req.session.user._id);

  if (count) {
    let userCart = await userHelpers.getCartDetails(req.session.user._id);
    if (userCart.status) {
      total = await userHelpers.getCartAmount(req.session.user._id);
    } else {
      total = await userHelpers.getTotalAmount(req.session.user._id);
    }
  }
  res.render("user/checkout", {
    user: true,
    total,
    users: req.session.user,
    count,
    prodList,
    address,
  });
});


router.post("/checkout",verifyLogin, async (req, res) => {
  let totalAmount = req.body.total
 let products = await userHelpers.getCartProductList(req.body.userId);
  userHelpers.placeOrder(req.body, products).then((data) => {
    if (data.paymentMethod === "COD") {
      res.json(data);
    } else if (data.paymentMethod === "Razorpay") {
      userHelpers.generateRazorpay(data, totalAmount).then((response) => {
        console.log(response);
        res.json(response);
      });
    } else if (data.paymentMethod === "paypal") {
      res.json(data);
    }
  });
});

router.post("/verify-payment", (req, res) => {
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false });
    });
});

router.get("/cancel-order/:id", (req, res) => {
  userHelpers.cancelOrder(req.params.id).then(() => {
    res.redirect("/myorders");
  });
});

router.post("/coupon", (req, res) => {
  userHelpers.checkCoupon(req.body, req.session.user._id).then((response) => {
    console.log(response);
    res.json(response);
  });
});

router.get('/contact',(req,res)=>{
  res.render('user/contact',{user:true, users: req.session.user})
})

router.get('/products',verifyLogin,async(req,res)=>{
  let prodList = await userHelpers.getCartProducts(req.session.user._id);
  productHelpers.getAllProducts().then((products) => {
  res.render('user/products',{user:true,products,users:req.session.user,prodList,prodSearch:true})
})
})



module.exports = router;
