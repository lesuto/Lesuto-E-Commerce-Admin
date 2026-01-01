import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

@Entity()
export class SupplierSubscription extends VendureEntity {
    constructor(input?: DeepPartial<SupplierSubscription>) {
        super(input);
    }

    @Column()
    sellerChannelId: string;

    @Column()
    supplierChannelId: string;
}