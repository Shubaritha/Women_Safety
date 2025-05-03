import Link from 'next/link';
import { Button } from '../ui/Button';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Your App
            </Link>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            <Link href="/dashboard" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/profile" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              Profile
            </Link>
            <Link href="/settings" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              Settings
            </Link>
          </div>

          <div className="flex items-center">
            <Button variant="primary" size="sm">
              Sign In
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}; 