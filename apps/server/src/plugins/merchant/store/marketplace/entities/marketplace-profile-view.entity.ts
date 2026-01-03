import { VendureEntity, Asset, DeepPartial } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

// We map this class to the EXISTING table "channel_supplier_profile"
// This allows us to read the data without crashing into the other plugin
@Entity({ name: 'channel_supplier_profile', synchronize: false }) 
export class MarketplaceProfileView extends VendureEntity {
    constructor(input?: DeepPartial<MarketplaceProfileView>) {
        super(input);
    }

    @Column()
    nameCompany: string;

    @Column({ type: 'text', nullable: true })
    shortDescription: string;

    @Column({ type: 'text', nullable: true })
    aboutCompany: string;

    @Column({ default: false })
    applyForMarketplace: boolean;

    @Column({ type: 'float', default: 0 })
    commission: number;

    @Column()
    channelId: string;

    // We map the Logo relationship manually here
    @ManyToOne(() => Asset)
    @JoinColumn({ name: 'logoId' })
    logo: Asset;

    @Column({ nullable: true })
    logoId: string;
}