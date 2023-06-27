require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { plan: planTable } = require("./db");

const getCurrentProductIdFromIdPlan = (currentProducts, id_plan) => {
    for (let index = 0; index < currentProducts.length; index++) {
        const currentProduct = currentProducts[index];

        if(currentProduct?.metadata?.id_plan == id_plan) {
            return currentProduct?.id;
        }
    }
    return -1;
};

const stripePrice = async (productId, plan) => {
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    let priceChanged = false;
    if(prices.data.length > 0) {
        for (let index = 0; index < prices.data.length; index++) {
            const price = prices.data[index];
            if(price.unit_amount != plan.price * 100) {
                await stripe.prices.update(price.id, {
                    active: false
                });
                priceChanged = true;
            }
        }
    }
    else priceChanged = true;

    if(priceChanged) {
        await stripe.prices.create({
            unit_amount: plan.price * 100,
            currency: plan.currency.toLowerCase(),
            recurring: { interval: 'month' },
            product: productId
        });
    }
};

const stripeProducts = async () => {
    const plans = await planTable.findAll();
    const theProducts = await stripe.products.list({ limit: 100 });
    const currentProducts = theProducts.data;
    
    plans.forEach(async plan => {
        let currentProductId = getCurrentProductIdFromIdPlan(currentProducts, plan.id);
        if(currentProductId == -1) { //New Product
            const newProduct = await stripe.products.create({
                name: plan.invoice_name,
                description: plan.invoice_description,
                metadata: {
                    id_plan: plan.id
                }
            });
            currentProductId = newProduct.id;
        }
        else { //Update Product
            await stripe.products.update(currentProductId, {
                name: plan.invoice_name,
                description: plan.invoice_description
            });
        }
        await stripePrice(currentProductId, plan);
    });
};

module.exports = {
    getCurrentProductIdFromIdPlan,
    stripeProducts
};