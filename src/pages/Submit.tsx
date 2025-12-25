import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Upload, Plus, X, CheckCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CategoryCard } from '@/components/nomination/CategoryCard';
import { AWARD_CATEGORIES, type AwardCategory } from '@/types/nomination';
import { toast } from 'sonner';

type Step = 'category' | 'info' | 'achievements' | 'review';

export default function Submit() {
  const [currentStep, setCurrentStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<AwardCategory | null>(null);
  const [description, setDescription] = useState('');
  const [achievements, setAchievements] = useState<string[]>(['']);
  const [activityHours, setActivityHours] = useState('');

  const steps: { key: Step; label: string }[] = [
    { key: 'category', label: 'เลือกประเภท' },
    { key: 'info', label: 'ข้อมูลเบื้องต้น' },
    { key: 'achievements', label: 'ผลงาน' },
    { key: 'review', label: 'ตรวจสอบ' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const handleNext = () => {
    if (currentStep === 'category' && !selectedCategory) {
      toast.error('กรุณาเลือกประเภทรางวัล');
      return;
    }
    if (currentStep === 'info' && !description.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (currentStep === 'achievements' && achievements.every((a) => !a.trim())) {
      toast.error('กรุณาเพิ่มผลงานอย่างน้อย 1 รายการ');
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleSubmit = () => {
    toast.success('ส่งเสนอชื่อสำเร็จ!', {
      description: 'ระบบได้รับข้อมูลของคุณแล้ว',
    });
  };

  const addAchievement = () => {
    setAchievements([...achievements, '']);
  };

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const updateAchievement = (index: number, value: string) => {
    const updated = [...achievements];
    updated[index] = value;
    setAchievements(updated);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">เสนอตนเองเป็นนิสิตดีเด่น</h1>
          <p className="text-muted-foreground">กรอกข้อมูลเพื่อเสนอตนเองสำหรับการพิจารณารางวัลนิสิตดีเด่น</p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                className="h-full gradient-primary rounded-full"
              />
            </div>

            {steps.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    index <= currentStepIndex
                      ? 'gradient-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium hidden sm:block ${
                    index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 'category' && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>เลือกประเภทรางวัล</CardTitle>
                <CardDescription>
                  เลือกประเภทรางวัลที่ตรงกับความสามารถและผลงานของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(AWARD_CATEGORIES) as AwardCategory[]).map((category, index) => (
                  <CategoryCard
                    key={category}
                    category={category}
                    selected={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                    index={index}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {currentStep === 'info' && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>ข้อมูลเบื้องต้น</CardTitle>
                <CardDescription>กรอกข้อมูลเกี่ยวกับตัวคุณและเหตุผลในการเสนอตนเอง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description">เหตุผลในการเสนอตนเอง *</Label>
                  <Textarea
                    id="description"
                    placeholder="อธิบายเหตุผลที่คุณควรได้รับรางวัลนิสิตดีเด่น..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                {selectedCategory === 'extracurricular' && (
                  <div className="space-y-2">
                    <Label htmlFor="hours">จำนวนชั่วโมงกิจกรรม *</Label>
                    <Input
                      id="hours"
                      type="number"
                      placeholder="เช่น 120"
                      value={activityHours}
                      onChange={(e) => setActivityHours(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>เอกสารประกอบ</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      รองรับไฟล์ PDF, JPG, PNG (สูงสุด 10MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'achievements' && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>ผลงานและความสำเร็จ</CardTitle>
                <CardDescription>ระบุผลงานและความสำเร็จที่โดดเด่นของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder={`ผลงานที่ ${index + 1}`}
                      value={achievement}
                      onChange={(e) => updateAchievement(index, e.target.value)}
                    />
                    {achievements.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAchievement(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
                <Button variant="outline" onClick={addAchievement} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  เพิ่มผลงาน
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 'review' && selectedCategory && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>ตรวจสอบข้อมูล</CardTitle>
                <CardDescription>ตรวจสอบข้อมูลก่อนส่งเสนอชื่อ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-1">ประเภทรางวัล</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <span>{AWARD_CATEGORIES[selectedCategory].icon}</span>
                    {AWARD_CATEGORIES[selectedCategory].label}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-1">เหตุผลในการเสนอตนเอง</p>
                  <p className="text-foreground">{description}</p>
                </div>

                {activityHours && (
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">ชั่วโมงกิจกรรม</p>
                    <p className="font-medium text-foreground">{activityHours} ชั่วโมง</p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground mb-2">ผลงานและความสำเร็จ</p>
                  <ul className="space-y-2">
                    {achievements
                      .filter((a) => a.trim())
                      .map((achievement, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span className="text-foreground">{achievement}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>

          {currentStep === 'review' ? (
            <Button variant="hero" onClick={handleSubmit} className="gap-2">
              ส่งเสนอชื่อ
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="hero" onClick={handleNext} className="gap-2">
              ถัดไป
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
