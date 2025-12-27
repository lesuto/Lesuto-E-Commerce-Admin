import {
    bootstrap,
    ChannelService,
    CustomerService,
    OrderService,
    RequestContextService,
    TransactionalConnection,
    User,
    CountryService,
    ListQueryBuilder,
    ProductVariant,
    Customer,
    Order,
    RequestContext,
    Channel
} from '@vendure/core';
import { config } from '../../src/vendure-config';

async function migrateGHDOrder() {
    const app = await bootstrap(config);

    const connection = app.get(TransactionalConnection);
    const ctxService = app.get(RequestContextService);
    const channelService = app.get(ChannelService);
    const customerService = app.get(CustomerService);
    const orderService = app.get(OrderService);
    const countryService = app.get(CountryService);
    const listQueryBuilder = app.get(ListQueryBuilder);

    // Superadmin context
    const superAdminUser = await connection.getRepository(User).findOne({
        where: { identifier: 'superadmin' },
    });
    if (!superAdminUser) throw new Error('Superadmin not found');

    const baseCtx = await ctxService.create({
        apiType: 'admin',
        user: superAdminUser,
    });

    // Host channel (LESUTO - payment channel)
    const hostChannel = await channelService.getChannelFromToken('LESUTO');
    if (!hostChannel) throw new Error('Host channel LESUTO not found');

    // Firm channel (TYREE - plan supplier)
    const firmChannel = await channelService.getChannelFromToken('TYREE');
    if (!firmChannel) throw new Error('Firm channel TYREE not found');

    // Host context (for order creation) - use channelOrToken
    const hostCtx = await ctxService.create({
        apiType: 'admin',
        user: superAdminUser,
        channelOrToken: hostChannel,
    });

    // Customer
    const email = 'rickycrysell@gmail.com';
    const customerList = await listQueryBuilder
        .build(Customer)
        .andWhere('customer.emailAddress = :email', { email })
        .getMany();

    let customer = customerList[0];

    if (!customer) {
        const createResult = await customerService.create(hostCtx, {
            emailAddress: email,
            firstName: 'Ricky',
            lastName: 'Crysell',
            phoneNumber: '3346176900',
        });
        if ('message' in createResult) {
            throw new Error(`Customer creation failed: ${createResult.message}`);
        }
        customer = createResult as Customer;
    }

    // US country
    const allCountries = await countryService.findAll(hostCtx);
    const usCountry = allCountries.items.find(c => c.code === 'US');
    if (!usCountry) throw new Error('US country not found');

    // Create order
    let order = await orderService.create(hostCtx, customer.id);

    // Addresses
    const addressInput = {
        fullName: 'Ricky Crysell',
        streetLine1: '430 Greenville bypass',
        city: 'Greenville',
        province: 'Alabama',
        postalCode: '37037',
        countryCode: 'US',
        phoneNumber: '3343820632',
    };

    order = await orderService.setShippingAddress(hostCtx, order.id, addressInput);
    order = await orderService.setBillingAddress(hostCtx, order.id, addressInput);

    // Find product variant by SKU '003-196'
    const variants = await listQueryBuilder
        .build(ProductVariant)
        .andWhere('productVariant.sku = :sku', { sku: '003-196' })
        .getMany();
    if (variants.length === 0) throw new Error('Product variant with SKU 003-196 not found');
    const variant = variants[0];

    // Add item to order
    const addResult = await orderService.addItemToOrder(hostCtx, order.id, variant.id, 1);
    if ('message' in addResult) {
        throw new Error(`Add item failed: ${addResult.message}`);
    }
    order = addResult as Order;

    // Update line price to 1985.00 (in cents)
    const orderLines = await connection.getRepository(hostCtx, 'OrderLine').find({
        where: { order: { id: order.id } },
    });
    for (const line of orderLines) {
        line.unitPrice = 198500;
        line.unitPriceWithTax = 198500;
        await connection.getRepository(hostCtx, 'OrderLine').save(line);
    }

    // Custom fields on order
    await connection.getRepository(hostCtx, 'Order').update(order.id, {
        customFields: {
            externalOrderId: '628314476',
            chargeId: 'ch_3MifWYIZfkrJ04SM1bSclK2M',
            hostPercentage: 15,
            firmPercentage: 50,
            firmBusinessId: 'TYREE',
        }
    });

    // Transition to Arranged
    const transitionResult = await orderService.transitionToState(hostCtx, order.id, 'ArrangingPayment');
    if ('transitionError' in transitionResult) {
        throw new Error(`Transition failed: ${transitionResult.transitionError}`);
    }
    order = transitionResult as Order;

    // Add payment
    const paymentResult = await orderService.addPaymentToOrder(hostCtx, order.id, {
        method: 'stripe', // change if your payment method code is different
        metadata: { chargeId: 'ch_3MifWYIZfkrJ04SM1bSclK2M' },
    });
    if ('message' in paymentResult) {
        throw new Error(`Payment failed: ${paymentResult.message}`);
    }

    // Assign firm channel
    await connection.rawConnection
        .createQueryBuilder()
        .insert()
        .into('order_channels_channel')
        .values({ orderId: order.id, channelId: firmChannel.id })
        .onConflict(`("orderId", "channelId") DO NOTHING`)
        .execute();

    console.log(`✅ Order migrated: ${order.code}`);
    console.log(`Visible in channels: LESUTO (host) and TYREE (firm)`);

    process.exit(0);
}

migrateGHDOrder();