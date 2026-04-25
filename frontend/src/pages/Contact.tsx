import { Phone, Mail, Clock, MapPin, MessageCircle } from 'lucide-react';

const Contact = () => {
  return (
    <div className="page-enter max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-16 reveal-up">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Have questions or want to visit our showroom? We'd love to hear from you!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div className="space-y-8">
          <div className="reveal-up stagger-1 bg-white p-8 rounded-3xl shadow-xl border border-gray-50 flex gap-6">
            <div className="bg-[#1a5c38]/10 p-4 rounded-2xl h-fit">
              <Phone className="w-6 h-6 text-[#1a5c38]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Phone / WhatsApp</h3>
              <p className="text-gray-600 mb-4 text-lg font-medium">+254 708898477</p>
              <a 
                href="https://wa.me/254708898477" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#1a5c38] font-bold hover:underline"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          <div className="reveal-up stagger-2 bg-white p-8 rounded-3xl shadow-xl border border-gray-50 flex gap-6">
            <div className="bg-[#1a5c38]/10 p-4 rounded-2xl h-fit">
              <Mail className="w-6 h-6 text-[#1a5c38]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email Address</h3>
              <p className="text-gray-600 text-lg font-medium">info@shalimart.co.ke</p>
            </div>
          </div>

          <div className="reveal-up stagger-3 bg-white p-8 rounded-3xl shadow-xl border border-gray-50 flex gap-6">
            <div className="bg-[#e8a020]/10 p-4 rounded-2xl h-fit">
              <Clock className="w-6 h-6 text-[#e8a020]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Business Hours</h3>
              <ul className="space-y-1 text-gray-600 font-medium">
                <li>Mon–Sat: 8:00 AM – 7:00 PM</li>
                <li>Sunday: 10:00 AM – 4:00 PM</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="reveal-up stagger-4 h-full">
          <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl h-full text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8a020]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1a5c38]/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="bg-[#e8a020] p-4 rounded-2xl w-fit mb-8">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-6">Visit Our Showroom</h2>
              <div className="space-y-4 text-lg text-gray-300">
                <p className="font-bold text-white text-xl">Royal Palm Mall</p>
                <p>Along Ronald Ngala Street</p>
                <p>Wing A, 5th Floor, Office 1</p>
                <p className="pt-4 flex items-center gap-2">
                  <span className="w-8 h-px bg-gray-700"></span>
                  Nairobi, Kenya
                </p>
              </div>
              
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-sm text-gray-400">Conveniently located in the heart of the city for all your shopping needs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
