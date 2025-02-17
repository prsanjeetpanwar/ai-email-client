import React from 'react'

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='flex flex-col items-center justify-center m-2'>
        {children}
      </div>
  )
}

export default layout
