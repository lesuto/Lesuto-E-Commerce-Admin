import { DefaultAssetNamingStrategy, RequestContext } from '@vendure/core';
import path from 'path';
import crypto from 'crypto';

export class StandardizedNamingStrategy extends DefaultAssetNamingStrategy {
    
    generateSourceFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string): string {
        const extension = path.extname(originalFileName);
        const randomId = crypto.randomBytes(6).toString('hex');
        
        const filename = `${randomId}${extension}`;
        
        // 👇 FIX: Explicitly put it in the 'source' folder
        return path.join('source', filename);
    }

    generatePreviewFileName(ctx: RequestContext, sourceFileName: string, conflictFileName?: string): string {
        // The sourceFileName passed here already includes 'source/' from the method above.
        // We need to strip that folder off to get the raw filename, then wrap it in 'preview/'
        
        const fileNamePart = path.basename(sourceFileName); // "a1b2.png"
        const previewName = super.generatePreviewFileName(ctx, fileNamePart, conflictFileName); // "a1b2__preview.png"
        
        // 👇 FIX: Explicitly put it in the 'preview' folder
        return path.join('preview', previewName);
    }
}