import { SignInButton, SignOutButton } from '@clerk/nextjs'
import React from 'react'
import LinkAccountButton from '~/components/link-account'
import { Button } from '~/components/ui/button'


const page = () => {
  return (
    <div className='text-blue-300'>
       <LinkAccountButton/>
       <SignOutButton />
       <SignInButton/>
       
    </div>
  )
}

export default page
