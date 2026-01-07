// File: ./cms/services/cms.service.ts
import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext, Channel } from '@vendure/core';
import { Page } from '../entities/page.entity';

@Injectable()
export class CMSService {
    constructor(private connection: TransactionalConnection) {}

    async getPage(ctx: RequestContext, slug: string): Promise<Page | null> {
        // Since Page is now ChannelAware, this findOne AUTOMATICALLY filters 
        // by the channel in ctx (e.g., 'bhd' channel)
        return this.connection.getRepository(ctx, Page).findOne({
            where: { slug },
        });
    }

    async savePage(ctx: RequestContext, slug: string, title: string, blocks: any) {
        const repo = this.connection.getRepository(ctx, Page);
        
        // This looks for a page with this slug INSIDE the current channel
        const existing = await repo.findOne({ where: { slug } });

        if (existing) {
            existing.title = title;
            existing.blocks = blocks;
            return repo.save(existing);
        } else {
            const newPage = new Page({ 
                slug, 
                title, 
                blocks,
                // Explicitly assign the current channel from the context
                channels: [ctx.channel] 
            });
            return repo.save(newPage);
        }
    }
}