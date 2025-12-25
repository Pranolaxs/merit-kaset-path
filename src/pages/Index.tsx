import { motion } from 'framer-motion';
import { Award, Users, CheckCircle2, Clock, ChevronRight, FileText, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { NominationCard } from '@/components/nomination/NominationCard';
import { CategoryCard } from '@/components/nomination/CategoryCard';
import { useNominations, useNominationStats } from '@/hooks/useNominations';
import { AWARD_CATEGORIES, type AwardCategory } from '@/types/nomination';

export default function Index() {
  const { data: nominations, isLoading } = useNominations();
  const stats = useNominationStats();

  const recentNominations = nominations?.slice(0, 3) || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Star className="h-4 w-4" />
                ปีการศึกษา 2567 ภาคต้น
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              ระบบนิสิตดีเด่น
              <span className="block gradient-primary bg-clip-text text-transparent mt-2">
                มหาวิทยาลัยเกษตรศาสตร์
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              เสนอตนเองเพื่อรับการพิจารณารางวัลนิสิตดีเด่น รับสิทธิ์ยกเว้นหรือส่วนลดค่าธรรมเนียมการศึกษา พร้อมเกียรติบัตรเชิดชูเกียรติ
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild variant="hero" size="xl">
                <Link to="/submit">
                  เสนอตนเองเป็นนิสิตดีเด่น
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/nominations">
                  ตรวจสอบสถานะ
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="ทั้งหมด"
            value={stats.total}
            description="รายการเสนอชื่อ"
            icon={FileText}
            variant="default"
            index={0}
          />
          <StatsCard
            title="กำลังพิจารณา"
            value={stats.pending}
            description="รอการอนุมัติ"
            icon={Clock}
            variant="warning"
            index={1}
          />
          <StatsCard
            title="อนุมัติแล้ว"
            value={stats.approved}
            description="ผ่านการพิจารณา"
            icon={CheckCircle2}
            variant="success"
            index={2}
          />
          <StatsCard
            title="ผู้สมัครปีนี้"
            value={stats.total}
            description="เพิ่มขึ้น 15%"
            icon={Users}
            trend={{ value: 15, isPositive: true }}
            variant="primary"
            index={3}
          />
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">ประเภทรางวัล</h2>
            <p className="text-muted-foreground mt-1">เลือกประเภทที่ตรงกับความสามารถของคุณ</p>
          </div>
          <Button asChild variant="ghost" className="gap-1">
            <Link to="/submit">
              ดูทั้งหมด
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {(Object.keys(AWARD_CATEGORIES) as AwardCategory[]).map((category, index) => (
            <Link to="/submit" key={category}>
              <CategoryCard category={category} index={index} />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Nominations Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">รายการล่าสุด</h2>
            <p className="text-muted-foreground mt-1">การเสนอชื่อนิสิตดีเด่นล่าสุด</p>
          </div>
          <Button asChild variant="ghost" className="gap-1">
            <Link to="/nominations">
              ดูทั้งหมด
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="h-24 bg-muted rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {recentNominations.map((nomination, index) => (
              <NominationCard key={nomination.id} nomination={nomination} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="gradient-primary p-8 md:p-12 text-center relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>
              
              <div className="relative">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-6">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  พร้อมเป็นนิสิตดีเด่นหรือยัง?
                </h2>
                <p className="text-white/80 mb-8 max-w-xl mx-auto">
                  เสนอตนเองเพื่อรับการพิจารณารางวัลนิสิตดีเด่น และรับสิทธิประโยชน์มากมาย
                </p>
                <Button asChild variant="secondary" size="lg" className="gap-2">
                  <Link to="/submit">
                    เริ่มต้นเสนอชื่อ
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>
    </Layout>
  );
}
