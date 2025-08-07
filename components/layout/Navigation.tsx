'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calculator, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavigationProps {
  className?: string;
  showCTA?: boolean;
}

const Navigation = ({ className = '', showCTA = true }: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '/docs', label: 'Documentation' },
    { href: '#contact', label: 'Contact' }
  ];

  return (
    <header 
      className={`sticky top-0 z-50 border-b ${className}`}
      style={{ 
        backgroundColor: 'var(--color-paintbox-surface)', 
        borderBottomColor: 'var(--color-paintbox-border)' 
      }}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-4">
              <Image
                src="/logos/paintbox-logo.svg"
                alt="Paintbox - Professional Estimation Software"
                width={180}
                height={45}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href}
                className="font-medium hover:opacity-75 transition-opacity"
                style={{ color: 'var(--color-paintbox-text-muted)' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            {showCTA && (
              <>
                <Link 
                  href="/login"
                  className="font-medium hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--color-paintbox-text-muted)' }}
                >
                  Sign In
                </Link>
                <Link 
                  href="/workflow/start"
                  className="paintbox-btn paintbox-btn-primary flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Start Estimate
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <X className="w-6 h-6" style={{ color: 'var(--color-paintbox-text)' }} />
            ) : (
              <Menu className="w-6 h-6" style={{ color: 'var(--color-paintbox-text)' }} />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t" style={{ borderColor: 'var(--color-paintbox-border)' }}>
            <nav className="flex flex-col space-y-4 pt-4">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href}
                  className="font-medium py-2 hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--color-paintbox-text-muted)' }}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {showCTA && (
                <div className="flex flex-col space-y-3 pt-4 border-t" style={{ borderColor: 'var(--color-paintbox-border)' }}>
                  <Link 
                    href="/login"
                    className="font-medium py-2 hover:opacity-75 transition-opacity"
                    style={{ color: 'var(--color-paintbox-text-muted)' }}
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/workflow/start"
                    className="paintbox-btn paintbox-btn-primary flex items-center justify-center gap-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <Calculator className="w-4 h-4" />
                    Start Estimate
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;