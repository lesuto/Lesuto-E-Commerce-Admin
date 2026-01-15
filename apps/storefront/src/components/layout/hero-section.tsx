'use client';

import {Button} from "@/components/ui/button";
import Link from "next/link";
import Image from 'next/image';
import { useChannel } from '@/app/providers/channel-provider';

export function HeroSection() {
    const { cmsContent } = useChannel();

    return (
        <section className="relative bg-muted overflow-hidden">
            <div className="container mx-auto px-4 py-24 md:py-32">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    {cmsContent.logoUrl && (
                      <Image 
                        src={cmsContent.logoUrl} 
                        alt="Store Logo" 
                        width={150} 
                        height={50} 
                        className="mx-auto mb-4"
                      />
                    )}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-2">
                        {cmsContent.heroTitle}
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                        {cmsContent.heroSubtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <Button asChild size="lg" className="min-w-[200px]">
                            <Link href="/search">
                                Shop Now
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

        </section>
    );
}