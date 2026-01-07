// File: ./cms/entities/page.entity.ts
import { DeepPartial, VendureEntity, ChannelAware, Channel } from '@vendure/core'; // Import ChannelAware & Channel
import { Column, Entity, ManyToMany, JoinTable } from 'typeorm';

@Entity()
export class Page extends VendureEntity implements ChannelAware { // Implement the interface
    constructor(input?: DeepPartial<Page>) {
        super(input);
    }

    @Column()
    slug: string;

    @Column()
    title: string;

    @Column('simple-json', { nullable: true })
    blocks: any;

    @Column({ default: true })
    enabled: boolean;

    // This is the magic that separates your data per subdomain
    @ManyToMany(type => Channel)
    @JoinTable()
    channels: Channel[];
}