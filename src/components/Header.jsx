import { Menu } from 'lucide-react'
import React from 'react'

function Header() {
  return (
    <header
      className={'fixed top-0 left-0 right-0 z-50 transition-all duration-500'}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            <span className="text-green-400">LAUREESH</span>
            <span className="text-white">VOLMAR</span>
            <span className="text-green-400">.</span>
          </div>

          {/* Desktop Menus */}
          <nav className="hidden md:flex space-x-8">
            {/* I will use logic */}
          </nav>

          <button className="hidden md:flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105">
            Download CV Now
          </button>

          {/* Mobile Menu Button */}
          <button className="text-white md:hidden">
            <Menu size={24}/>
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden mt-4 pb-4 border-t border-slate-800 pt-4 bg-slate-800 rounded-lg shadow-lg">
          {/* I will use logic */}
          <button className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-all duration-300">
            Download CV Now
          </button>
        </nav>

      </div>
    </header>
  );
}