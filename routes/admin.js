const { response } = require("express");
var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");

const verifyLogin = (req, res, next) => {
  if (req.session.adminloggedIn) {
    next();
  } else {
    res.redirect("/admin");
  }
};
/* GET users listing. */

router.get("/", async(req, res) => {
  let admin = req.session.adminloggedIn;
  if (admin) {
    let placedOrder =await productHelpers.getPlacedOrder()
  let shippedOrder = await productHelpers.getShippedOrder()
  let deliveredOrder = await productHelpers.getDeliveredOrder()
  let cancelledOrder = await productHelpers.getCancelledOrder()
  let order = [placedOrder,shippedOrder,deliveredOrder,cancelledOrder]
  let totalProducts = await productHelpers.getProductsLength()
  let totalUser = await productHelpers.getUserLength()
  // let totalAmount = await productHelpers.getTotalAmount()
  let razorpay = await productHelpers.getRazorpayPaid()
  let COD = await productHelpers.getCodPaid()
  let paypal = await productHelpers.getPaypalPaid()
  let payment = [razorpay,COD,paypal]
  let orders = await productHelpers.getOrderNumber()
  res.render("admin/dashboard",{admin:true,order,totalProducts,totalUser,payment,orders})
  } else {
    res.render("admin/adminlogin", { loginErr: req.session.loginErr });
    req.session.loginErr = false;
  }
});


router.post("/", (req, res) => {
  productHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminloggedIn = true;
      req.session.admin = response.admin;
      res.redirect("/admin");
    } else {
      req.session.loginErr = "Invalid username or password";
      res.redirect("/admin");
    }
  });
});

router.get("/adminlogout", (req, res) => {
  req.session.adminloggedIn = false;
  res.redirect("/admin");
});

router.get("/product-manager",verifyLogin, (req, res) => {
  productHelpers.getAllProducts().then((products) => {
    res.render("admin/product-manager", { admin: true, products });
  });
});

router.get("/add-product",verifyLogin, function (req, res) {
  res.render("admin/add-product", { admin: true });
});

router.post("/add-product", (req, res) => {
  productHelpers.addProduct(req.body).then((id) => {
    let image1 = req.files.image1;
    let image2 = req.files.image2;
    let image3 = req.files.image3;
    let image4 = req.files.image4;
    image1.mv("./public/product-images/" + id + "first" + ".jpg");
    image2.mv("./public/product-images/" + id + "second" + ".jpg");
    image3.mv("./public/product-images/" + id + "third" + ".jpg");
    image4.mv("./public/product-images/" + id + "fourth" + ".jpg");
    res.redirect("/admin/product-manager/");
  });
});

router.get("/delete-product/:id", (req, res) => {
  let productId = req.params.id;
  productHelpers.deleteProduct(productId).then((response) => {
    res.redirect("/admin/product-manager/");
  });
});

router.get("/edit-product/:id", async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render("admin/edit-product", { product, admin: true });
});

router.post("/edit-product/:id", (req, res) => {
  let id = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin/product-manager");
    if (req.files.image1) {
      let image1 = req.files.image1;
      image1.mv("./public/product-images/" + id + "first" + ".jpg");
    } else if (req.files.image2) {
      let image2 = req.files.image2;
      image2.mv("./public/product-images/" + id + "second" + ".jpg");
    } else if (req.files.image3) {
      let image3 = req.files.image3;
      image3.mv("./public/product-images/" + id + "third" + ".jpg");
    } else if (req.files.image4) {
      let image4 = req.files.image4;
      image4.mv("./public/product-images/" + id + "fourth" + ".jpg");
    }
  });
});

router.get("/user-manager",verifyLogin, (req, res) => {
  productHelpers.getAllUsers().then((users) => {
    console.log(users);
    res.render("admin/user-manager", { admin: true, users });
  });
});

router.get("/block-user/:id", (req, res) => {
  productHelpers.blockUser(req.params.id).then(() => {
    res.redirect("/admin/user-manager");
  });
});

router.get("/unblock-user/:id", (req, res) => {
  productHelpers.unblockUser(req.params.id).then(() => {
    res.redirect("/admin/user-manager");
  });
});

router.get("/order-manager",verifyLogin, async (req, res) => {
  let orders = await productHelpers.getOrderDetails();
  res.render("admin/order-manager", { admin: true, orders });
});

router.get("/order-product-details/:id",verifyLogin, (req, res) => {
  userHelpers.getOrderProducts(req.params.id).then((products) => {
    res.render("admin/order-product-details", { admin: true, products });
  });
});

router.post("/changeStatus", (req, res) => {
  productHelpers.changeStatus(req.body.order).then((response) => {
    res.json({ status: true });
  });
});

router.post("/changeToDeliver", (req, res) => {
  productHelpers.changeStatusDelivered(req.body.order).then((response) => {
    res.json({ status: true });
  });
});

router.get("/coupon-manager",verifyLogin, (req, res) => {
  productHelpers.availableCoupons().then((coupons) => {
    res.render("admin/coupon-manager", { admin: true, coupons });
  });
});

router.post("/add-coupon",verifyLogin, (req, res) => {
  productHelpers.insertCoupon(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/activate-coupon/:id", (req, res) => {
  console.log(req.params.id);
  productHelpers.activateCoupon(req.params.id).then(() => {
    res.redirect("/admin/coupon-manager");
  });
});

router.get("/deactivate-coupon/:id", (req, res) => {
  productHelpers.deactivateCoupon(req.params.id).then(() => {
    res.redirect("/admin/coupon-manager");
  });
});

router.get("/offer-manager",verifyLogin, (req, res) => {
  productHelpers.getAllProducts().then((product) => {
    res.render("admin/offer-manager", { admin: true, product });
  });
});

router.get("/add-offer/:id",verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render("admin/add-offer", { product, admin: true });
});

router.post("/add-offer/:id", async (req, res) => {
productHelpers.updateOffer(req.params.id,req.body).then(()=>{
  res.redirect("/admin/offer-manager")
})
});

router.get("/delete-offer/:id/:price", async (req, res) => {
  productHelpers.deleteProductOffer(req.params.id,req.params.price).then(()=>{
    res.redirect("/admin/offer-manager")
  })
});


router.get("/report",verifyLogin,async(req,res)=>{  
  let orders = await productHelpers.getOrderDetails();
  res.render("admin/report",{admin:true,Nodata:true,orders})
})

router.get("/report-product/:id",verifyLogin, (req, res) => {
  userHelpers.getOrderProducts(req.params.id).then((products) => {
    res.render("admin/report-product", { admin: true, products });
  });
});

router.post('/orderSales',async(req,res)=>{
  let dates = req.body
  let report = await productHelpers.getSalesReport(req.body)
  res.render('admin/orderReport',({report,Nodata:true,admin:true,dates}))
})


router.get('/delete-coupon/:id',(req,res)=>{
  productHelpers.deleteCoupon(req.params.id).then(()=>{
    res.redirect('/admin/coupon-manager')
  })
})

router.get('/edit-coupon/:id',(req,res)=>{
  productHelpers.getCoupon(req.params.id).then((coupon)=>{
    res.render('admin/edit-coupon',{admin:true,coupon})
  })
})

router.post('/update-coupon/:id',(req,res)=>{
  productHelpers.updateCoupon(req.params.id,req.body).then(()=>{
    res.redirect('/admin/coupon-manager')
  })
})

router.get("/cancel-order/:id", (req, res) => {
  userHelpers.cancelOrder(req.params.id).then(() => {
    res.redirect("/admin/order-manager");
  });
});

module.exports = router;
