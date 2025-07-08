import Link from "next/link"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {ArrowRight, Sparkles, Building2} from "lucide-react"
import {AnimatedBackground} from "@/components/shared/animated-background"

export default function HomePage() {
  return (
    <AnimatedBackground variant='video'>
      <div className='flex min-h-screen items-center justify-center relative'>
        {/* Main Content Container */}
        <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center'>
          {/* Main Heading */}
          <h1 className='text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl mb-8'>
            <span className='text-gradient-purple'>Co-Create.</span>
            <br />
            <span className='text-gradient-pink'>Earn Together.</span>
          </h1>

          {/* Subheading */}
          <p className='text-xl leading-8 text-white/90 sm:text-2xl mb-12 max-w-3xl mx-auto'>
            Craft stunning fan content with official brand assets—every piece is
            rights-cleared, on-chain tracked, and revenue-shared so creators
            shine and brands profit.
          </p>

          {/* Call-to-Action Buttons */}
          <div className='flex flex-col sm:flex-row items-center justify-center gap-6 mb-12'>
            <Link href='/register'>
              <Button
                size='lg'
                className='h-14 px-10 text-lg bg-gradient-to-r from-gradient-purple to-gradient-pink hover:from-gradient-purple/90 hover:to-gradient-pink/90 border-0 shadow-2xl'
              >
                Start Creating Today
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
            </Link>
            <Link href='/login'>
              <Button
                variant='outline'
                size='lg'
                className='h-14 px-10 text-lg bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 shadow-xl'
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Key Features */}
          <div className='flex flex-wrap justify-center gap-4 mb-12'>
            <Badge
              variant='outline'
              className='bg-gradient-purple/20 backdrop-blur-md border-white/30 text-white px-4 py-2'
            >
              <Sparkles className='w-4 h-4 mr-2' />
              Sanctioned Fan Content Platform
            </Badge>
            <Badge
              variant='outline'
              className='bg-gradient-blue/20 backdrop-blur-md border-white/30 text-white px-4 py-2'
            >
              <Building2 className='w-4 h-4 mr-2' />
              Enterprise Scale
            </Badge>
          </div>

          {/* Optional: Small feature callouts */}
          <div className='mt-16 flex flex-wrap justify-center gap-8 text-white/80 text-sm'>
            <div className='flex items-center'>
              <div className='w-2 h-2 bg-gradient-purple rounded-full mr-2'></div>
              Official Brand Assets
            </div>
            <div className='flex items-center'>
              <div className='w-2 h-2 bg-gradient-pink rounded-full mr-2'></div>
              Legal Protection
            </div>
            <div className='flex items-center'>
              <div className='w-2 h-2 bg-gradient-blue rounded-full mr-2'></div>
              Revenue Sharing
            </div>
            <div className='flex items-center'>
              <div className='w-2 h-2 bg-gradient-to-r from-gradient-purple to-gradient-pink rounded-full mr-2'></div>
              Creative Freedom
            </div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  )
}
