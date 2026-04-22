import { ShoppingBag, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
              <ShoppingBag className="w-7 h-7 text-[#e8a020]" />
              <span>Shalina Mart</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your one-stop shop for quality products delivered across Kenya. From farm equipment to household essentials.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/shop" className="text-gray-400 hover:text-[#e8a020] transition-colors text-sm">All Products</Link></li>
              <li><Link to="/shop?category=Household+Items" className="text-gray-400 hover:text-[#e8a020] transition-colors text-sm">Household</Link></li>
              <li><Link to="/shop?category=Agro+/+Farm+Equipment" className="text-gray-400 hover:text-[#e8a020] transition-colors text-sm">Farm Equipment</Link></li>
              <li><Link to="/cart" className="text-gray-400 hover:text-[#e8a020] transition-colors text-sm">My Cart</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              <li><Link to="/login" className="text-gray-400 hover:text-[#e8a020] transition-colors text-sm">Login / Register</Link></li>
              <li><Link to="/orders" className="text-gray-400 hover:text-[#e8a020] transition-colors text-sm">Track Order</Link></li>
              <li><span className="text-gray-400 text-sm">Delivery across Nairobi</span></li>
              <li><span className="text-gray-400 text-sm">M-Pesa Payments</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#e8a020]" />
                <span>+254 700 000 000</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[#e8a020]" />
                <span>hello@shalimart.co.ke</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[#e8a020]" />
                <span>Nairobi, Kenya</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Shalina Mart. All rights reserved.</p>
          <p className="text-gray-500 text-sm">Made with ❤️ in Kenya</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
