import { Award, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md">
                <Award className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">นิสิตดีเด่น</h3>
                <p className="text-xs text-muted-foreground">Kasetsart University</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ระบบเสนอชื่อและพิจารณานิสิตดีเด่น กองพัฒนานิสิต มหาวิทยาลัยเกษตรศาสตร์
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">ลิงก์ด่วน</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/submit" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  เสนอตนเองเป็นนิสิตดีเด่น
                </Link>
              </li>
              <li>
                <Link to="/nominations" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  ตรวจสอบสถานะ
                </Link>
              </li>
              <li>
                <a
                  href="https://kasets.art/gpgs5v"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  ประกาศนิสิตดีเด่น
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">ติดต่อเรา</h4>
            <address className="text-sm text-muted-foreground not-italic space-y-2">
              <p>กองพัฒนานิสิต มหาวิทยาลัยเกษตรศาสตร์</p>
              <p>50 ถนนงามวงศ์วาน แขวงลาดยาว</p>
              <p>เขตจตุจักร กรุงเทพฯ 10900</p>
              <p className="pt-2">
                <a href="mailto:sa@ku.ac.th" className="hover:text-primary transition-colors">
                  sa@ku.ac.th
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} กองพัฒนานิสิต มหาวิทยาลัยเกษตรศาสตร์. สงวนลิขสิทธิ์.
          </p>
        </div>
      </div>
    </footer>
  );
}
