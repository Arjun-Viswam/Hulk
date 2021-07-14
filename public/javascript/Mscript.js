
function addToCart(productId){
    $.ajax({
        url:'/add-to-cart/'+productId,
        method:'get',
        success:(response)=>{
            if(response.status){
                let count=$('#cart-count').html()
                // let count2=$('#cart-count2').html()
                count=parseInt(count)+1
                // count2=parseInt(count2)+1
                $('#cart-count').html(count)
                // $('#cart-count2').html(count2)
                alert("product added to cart")
            }else{
                location.href='/login'
            }
        }
    })
}




	
 