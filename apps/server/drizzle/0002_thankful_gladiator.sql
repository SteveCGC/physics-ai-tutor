ALTER TABLE "exams" DROP CONSTRAINT "exams_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "exams" ALTER COLUMN "class_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE cascade;