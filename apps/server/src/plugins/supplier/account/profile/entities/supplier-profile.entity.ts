import { DeepPartial, VendureEntity, Asset, Channel, ID, EntityId } from '@vendure/core';
import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';

@Entity('channel_supplier_profile')
export class SupplierProfile extends VendureEntity {
    constructor(input?: DeepPartial<SupplierProfile>) {
        super(input);
    }

    @Column({ type: 'text', nullable: true})
    nameCompany: string;

    @Column({ nullable: true })
    shortDescription: string;

    @Column({ type: 'text', nullable: true })
    aboutCompany: string;

    @Column({ default: false })
    applyForMarketplace: boolean;

    @Column({ type: 'float', default: 0 })
    commission: number;

    // Link to the Logo Asset
    @ManyToOne(() => Asset, { nullable: true })
    logo: Asset;

    @EntityId({ nullable: true })
    logoId: ID;

    // Link one-to-one with the Channel
    @OneToOne(() => Channel)
    @JoinColumn()
    channel: Channel;

    @EntityId()
    channelId: ID;
}