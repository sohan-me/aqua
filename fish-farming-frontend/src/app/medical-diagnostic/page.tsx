'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Heart, Eye, Brain, Zap, Droplets, Activity, Fish, MapPin, Edit3, Save, X } from 'lucide-react';
import { usePonds } from '@/hooks/useApi';
import { Pond, MedicalDiagnostic } from '@/lib/api';
import { extractApiData } from '@/lib/utils';
import { api } from '@/lib/api';
import Link from 'next/link';

// Medical data from the JSON file
const medicalData = {
  organs: [
    { id: 'skin', name: 'ত্বক (Skin)', icon: '🩹' },
    { id: 'eye', name: 'চোখ (Eye)', icon: '👁️' },
    { id: 'gill', name: 'ফুলকা (Gill)', icon: '🫁' },
    { id: 'liver', name: 'যকৃত (Liver)', icon: '🫀' },
    { id: 'intestine', name: 'অন্ত্র (Intestine)', icon: '🔄' },
    { id: 'spleen', name: 'প্লীহা (Spleen)', icon: '❤️' },
    { id: 'kidney', name: 'কিডনি (Kidney)', icon: '🫘' },
    { id: 'swim_bladder', name: 'সুইম ব্লাডার (Swim bladder)', icon: '💨' },
    { id: 'brain', name: 'মস্তিষ্ক (Brain)', icon: '🧠' },
    { id: 'muscle', name: 'মাংসপেশি (Muscle)', icon: '💪' }
  ],
  conditions: {
    skin: {
      healthy: ['মসৃণ, চকচকে, অক্ষত আঁশ', 'স্বাভাবিক রঙ', 'কোনো ক্ষত নেই'],
      unhealthy: ['আলসার/ঘা', 'রক্তক্ষরণ', 'তুলোর মতো বৃদ্ধি', 'সাদা দাগ', 'লবণ দানার মতো সাদা দাগ', 'নীল-ধূসর প্যাচ', 'চাকতি-সদৃশ উকুন', 'সুতো কৃমি গেঁথে আছে', 'ত্বকের নিচে গোলমরিচ দাগ', 'আঁশ ক্ষতি', 'আঘাত']
    },
    eye: {
      healthy: ['স্বচ্ছ, উজ্জ্বল', 'স্বাভাবিক আকার', 'কোনো ফোলা নেই'],
      unhealthy: ['ঘোলাটে', 'ফোলা', 'দেবে যাওয়া', 'Pop-eye', 'চোখের চারপাশে রক্ত', 'কর্নিয়া অস্বচ্ছ', 'চোখে গ্যাস বাবল']
    },
    gill: {
      healthy: ['উজ্জ্বল লাল', 'সমান ফিলামেন্ট', 'স্বাভাবিক রঙ'],
      unhealthy: ['ফ্যাকাশে/সাদা (অ্যানিমিয়া)', 'পিচ্ছিল (প্রটোজোয়া)', 'ক্ষয় (BGD)', 'রক্তক্ষরণ (কলামনারিস)', 'বাদামী নেক্রোসিস', 'ফুলকা ছেঁড়া', 'সুতো কৃমি', 'হাঁফাচ্ছে', 'ভারী মিউকাস', 'কস্টিয়া সাইন', 'ফুলকা পুরু', 'লালচে-বাদামী স্তর']
    },
    liver: {
      healthy: ['লালচে-বাদামি', 'মসৃণ', 'স্বাভাবিক আকার'],
      unhealthy: ['ফ্যাকাশে', 'ফ্যাটি লিভার', 'ফোলা', 'গুটি/নডিউল', 'রক্তক্ষরণ', 'হলুদ, তেলতেলে', 'পিত্ত বড়', 'অ্যাবসেস']
    },
    intestine: {
      healthy: ['দৃঢ়', 'হজমকৃত খাদ্যে পূর্ণ', 'স্বাভাবিক রঙ'],
      unhealthy: ['খালি', 'সাদা মল', 'ফোলা', 'মিউকাসে ভরা', 'লাল, গ্যাস', 'দুর্গন্ধ', 'দেয়াল পাতলা', 'সাদা সুতো কৃমি', 'অন্ত্র ফ্যাকাশে']
    },
    spleen: {
      healthy: ['ছোট', 'লালচে', 'স্বাভাবিক আকার'],
      unhealthy: ['বড় ও গাঢ়/কালচে', 'ফোলা', 'রক্তক্ষরণ', 'পিটেকিয়াল', 'খুব বড়']
    },
    kidney: {
      healthy: ['দৃঢ়', 'লালচে', 'স্বাভাবিক আকার'],
      unhealthy: ['ফোলা', 'কালচে', 'রক্তক্ষরণযুক্ত', 'পিটেকিয়াল', 'অ্যাবসেস']
    },
    swim_bladder: {
      healthy: ['স্বচ্ছ', 'স্বাভাবিকভাবে ফুলে থাকা', 'সঠিক আকার'],
      unhealthy: ['ফেটে যাওয়া', 'গ্যাস বাবল', 'একদিকে ভাসে', 'ডুবে থাকতে পারে না']
    },
    brain: {
      healthy: ['স্বাভাবিক', 'ফোলা নয়', 'সঠিক আকার'],
      unhealthy: ['প্রদাহ', 'রক্তক্ষরণ', 'ঘূর্ণি/স্পাইরাল সাঁতার', 'স্নায়বিক সাইন', 'খিঁচুনি']
    },
    muscle: {
      healthy: ['দৃঢ়', 'সাদা', 'স্বাভাবিক টেক্সচার'],
      unhealthy: ['নরম', 'রক্তক্ষরণের দাগ', 'সিস্ট', 'অঙ্গ/মাংসে সিস্ট', 'পাখনা ভঙ্গুর', 'ক্ষত সারতে দেরি']
    }
  },
  diseases: [
    {
      id: 'do_crash',
      name: 'DO ক্র্যাশ/হাইপোক্সিয়া',
      symptoms: ['ফুলকা ফ্যাকাশে', 'উপরে ভেসে শ্বাস', 'ইনলেটে ভিড়', 'ভোরে মৃত্যু'],
      treatment: 'Aerator (এয়ারেটর), Water exchange (পানি পরিবর্তন), Agricultural Lime (কৃষি চুন/ক্যালসিয়াম কার্বোনেট—CaCO₃)',
      dosage: 'এয়ারেটর সাথে সাথেই; পানি ২০–৩০% বদল; চুন ১–২ কেজি/ডেসিমেল (সন্ধ্যায়); DO >5 mg/L; ২৪ ঘন্টা খাবার কমানো'
    },
    {
      id: 'ammonia_toxicity',
      name: 'অ্যামোনিয়া/নাইট্রাইট টক্সিসিটি',
      symptoms: ['শৈবাল মরার পর ফুলকা বাদামী', 'দুর্গন্ধ', 'অলসতা'],
      treatment: 'Zeolite (জিওলাইট), Salt – NaCl (লবণ), Water exchange (পানি বদল), Reduce feed (খাবার কমানো)',
      dosage: 'জিওলাইট ২–৩ কেজি/ডেসিমেল; লবণ ১–২ কেজি/ডেসিমেল; ৩০–৫০% পানি বদল; ২৪–৪৮ ঘন্টা খাবার বন্ধ/কম'
    },
    {
      id: 'trichodina',
      name: 'Trichodina spp.',
      symptoms: ['অতিরিক্ত মিউকাস', 'গা ঘষা', 'মাইক্রোস্কোপে চাকতি-চাকার মতো'],
      treatment: 'Salt dip (লবণ ডিপ), Potassium Permanganate—KMnO₄ (পটাশিয়াম পারম্যাঙ্গানেট), Formalin (ফরমালিন; আইনি হলে)',
      dosage: 'লবণ ডিপ ২–৩% ৫–১০ মিনিট; KMnO₄ ২–৩ গ্রা/ডেসিমেল; ফরমালিন ২৫ ppm পুরো পুকুর'
    },
    {
      id: 'dactylogyrus',
      name: 'Dactylogyrus/Gyrodactylus (ফ্লুক)',
      symptoms: ['ফুলকা ছেঁড়া', 'সুতো কৃমি', 'হাঁফাচ্ছে'],
      treatment: 'Praziquantel (প্রাজিকোয়ান্টেল), Salt (লবণ), KMnO₄ (পটাশ)',
      dosage: 'প্রাজিকোয়ান্টেল ২–৫ mg/L বাথ বা ১০–২০ mg/kg ফিড ×৩–৫ দিন; লবণ ১–২ কেজি/ডেসিমেল; KMnO₄ ২ গ্রা/ডেসিমেল'
    },
    {
      id: 'ich',
      name: 'Ich (ইচ/সাদা দাগ)',
      symptoms: ['ত্বক/পাখনায় লবণ দানার মতো সাদা দাগ'],
      treatment: 'Formalin (ফরমালিন) + Malachite Green (ম্যালাকাইট গ্রিন), Salt (লবণ), KMnO₄ (পটাশ)',
      dosage: 'ফরমালিন ২৫ ppm ১ ঘন্টা শক্ত এয়ারেশনে ×৩ (৪৮ ঘন্টা অন্তর); বা লবণ ৩–৫% ডিপ ৫–১০ মিনিট; KMnO₄ ২ গ্রা/ডেসিমেল'
    },
    {
      id: 'costia',
      name: 'Costia/Ichthyobodo',
      symptoms: ['নীল-ধূসর প্যাচ', 'ভারী মিউকাস', 'কস্টিয়া সাইন'],
      treatment: 'Salt (লবণ), KMnO₄ (পটাশ), Formalin (ফরমালিন; আইনি হলে)',
      dosage: 'লবণ ডিপ ৩–৫% ৫–১০ মিনিট; KMnO₄ ২–৩ গ্রা/ডেসিমেল; ৪৮–৭২ ঘন্টা পর রি-ডোজ'
    },
    {
      id: 'bacterial_ulcer',
      name: 'Bacterial Ulcer (Aeromonas/Pseudomonas)',
      symptoms: ['লাল প্রান্তসহ আলসার', 'আঁশ ঝরা'],
      treatment: 'Oxytetracycline—OTC (অক্সিটেট্রাসাইক্লিন), Florfenicol (ফ্লরফেনিকল), KMnO₄ (পটাশ)',
      dosage: 'OTC ৫০–৭৫ mg/kg/দিন ×৫–৭ দিন; বা ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫ দিন; KMnO₄ ২ গ্রা/ডেসিমেল'
    },
    {
      id: 'saprolegnia',
      name: 'Saprolegnia (ছত্রাক)',
      symptoms: ['তুলার মতো সাদা গুচ্ছ'],
      treatment: 'KMnO₄ (পটাশ), Salt (লবণ), Povidone-Iodine (পোভিডোন-আয়োডিন)',
      dosage: 'KMnO₄ ২–৩ গ্রা/ডেসিমেল; লবণ ১–২ কেজি/ডেসিমেল; ক্ষতে আয়োডিন ব্রাশ'
    },
    {
      id: 'algal_crash',
      name: 'Algal crash/H₂S এক্সপোজার',
      symptoms: ['সবুজ পিচ্ছিল', 'কম DO-তে কালো প্যাচ'],
      treatment: 'Aeration (এয়ারেশন), Water exchange (পানি বদল), Agricultural Lime (কৃষি চুন)',
      dosage: 'জরুরি এয়ারেশন; ৩০–৫০% পানি বদল; চুন ১–২ কেজি/ডেসিমেল; কালো স্লাজ নাড়ানো এড়ান'
    },
    {
      id: 'argulus',
      name: 'Argulus (মাছের উকুন)',
      symptoms: ['ত্বকে চাকতি-সদৃশ উকুন'],
      treatment: 'Trichlorfon/Dipterex (ট্রাইক্লোরফন), Salt dip (লবণ ডিপ)',
      dosage: 'ট্রাইক্লোরফন ০.২৫–০.৫ mg/L; ৭–১০ দিনে রিপিট; লবণ ডিপ ৩–৫% ৫–১০ মিনিট'
    },
    {
      id: 'lernaea',
      name: 'Lernaea (অ্যাঙ্কর ওয়ার্ম)',
      symptoms: ['সুতো কৃমি গেঁথে আছে', 'স্থানে লালচে দাগ'],
      treatment: 'Manual removal (হাতে টেনে তোলা) + Iodine (আয়োডিন), Trichlorfon (ট্রাইক্লোরফন)',
      dosage: 'কৃমি টেনে বের করে আয়োডিন; ট্রাইক্লোরফন ০.২৫–০.৫ mg/L; ১০–১৪ দিনে রিপিট'
    },
    {
      id: 'septicemia',
      name: 'Septicemia/ Gas supersaturation',
      symptoms: ['Pop-eye', 'চোখের চারপাশে রক্ত'],
      treatment: 'Florfenicol (ফ্লরফেনিকল), Water improvement (পানি উন্নয়ন)',
      dosage: 'ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫ দিন; সুপারস্যাচুরেশন কমান; নরম পানি বদল'
    },
    {
      id: 'toxicity',
      name: 'Toxicity/Neurological stress',
      symptoms: ['ঘূর্ণি/স্পাইরাল সাঁতার', 'বাহ্যিক ক্ষত নেই'],
      treatment: 'Water exchange (পানি বদল), Activated Carbon (অ্যাক্টিভেটেড কার্বন), Stop feeding',
      dosage: '৫০–৮০% পানি বদল; ইনফ্লো স্ক্রিনে কার্বন ১০–২০ গ্রা/মি³; উৎস খুঁজে সমাধান'
    },
    {
      id: 'chronic_starvation',
      name: 'Chronic starvation/Anemia',
      symptoms: ['লিভার ফ্যাকাশে', 'পিত্ত বড়', 'অন্ত্র খালি'],
      treatment: 'Quality Feed (ভালো ফিড), Vitamin–Mineral Premix (ভিট-মিন প্রিমিক্স)',
      dosage: 'গ্রোয়ার প্রোটিন ২৮–৩২%; Vit C ৫০০–১০০০ mg/kg ফিড'
    },
    {
      id: 'fatty_liver',
      name: 'Fatty Liver (হেপাটিক লিপিডোসিস)',
      symptoms: ['লিভার বড়', 'হলুদ', 'তেলতেলে'],
      treatment: 'Reduce ration (রেশন কমানো), Probiotics (প্রোবায়োটিক), Vitamin E + Selenium (ভিট E + সেলেনিয়াম)',
      dosage: 'খাবার ২০–৩০% কম ১–২ সপ্তাহ; Vit E ১০০–২০০ mg/kg + Se ০.৩ mg/kg; প্রোবায়োটিক লেবেলমতো'
    },
    {
      id: 'bacterial_septicemia',
      name: 'Bacterial Septicemia',
      symptoms: ['লিভার/কিডনিতে পিটেকিয়াল', 'প্লীহা বড়', 'অ্যাসাইটিস'],
      treatment: 'Oxytetracycline (অক্সিটেট্রাসাইক্লিন) / Florfenicol (ফ্লরফেনিকল), KMnO₄ (পটাশ)',
      dosage: 'OTC ৫০–৭৫ mg/kg/দিন ×৫–৭; বা ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫; KMnO₄ ২ গ্রা/ডেসিমেল'
    },
    {
      id: 'bacterial_enteritis',
      name: 'Bacterial Enteritis',
      symptoms: ['অন্ত্র লাল', 'গ্যাস', 'দুর্গন্ধ', 'দেয়াল পাতলা'],
      treatment: 'Oxytetracycline (অক্সিটেট্রাসাইক্লিন), Probiotics (প্রোবায়োটিক)',
      dosage: 'OTC ৫০–৭৫ mg/kg/দিন ×৫; প্রোবায়োটিক লেবেলমতো; রেশন ২০–৩০% কম'
    },
    {
      id: 'intestinal_nematodes',
      name: 'Intestinal Nematodes',
      symptoms: ['অন্ত্রে মিউকাস', 'সাদা সুতো কৃমি'],
      treatment: 'Levamisole (লেভামিসোল)/Piperazine (পাইপেরাজিন)/Fenbendazole (ফেনবেনডাজল)',
      dosage: 'লেভামিসোল ১০ mg/kg একবার, ৭–১০ দিনে রিপিট; বা ফেনবেনডাজল ১০ mg/kg/দিন ×৩'
    },
    {
      id: 'cestodes',
      name: 'Cestodes (Metacestodes)',
      symptoms: ['অঙ্গ/মাংসে সিস্ট', 'ছোট টেপওয়ার্ম মাথা'],
      treatment: 'Praziquantel (প্রাজিকোয়ান্টেল) ফিডে; Sanitation',
      dosage: 'প্রাজিকোয়ান্টেল ১০–২০ mg/kg ফিড ×১–৩ দিন; পাখির প্রবেশ রোধ; সাইকেলে শুকানো'
    },
    {
      id: 'dropsy',
      name: 'Dropsy/Ascites',
      symptoms: ['পেট ফোলা', 'গহ্বরে স্বচ্ছ/হলুদ তরল'],
      treatment: 'Florfenicol (ফ্লরফেনিকল), Salt Bath (লবণ), Supportive care',
      dosage: 'ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫; লবণ ১–২ কেজি/ডেসিমেল; পানি উন্নয়ন; মরিবুন্দ কুল'
    },
    {
      id: 'tilv',
      name: 'TiLV সন্দেহ',
      symptoms: ['সব সাইজে হঠাৎ মৃত্যু', 'কালচে ত্বক', 'অ্যানিমিয়া'],
      treatment: 'Biosecurity (বায়োসিকিউরিটি), Secondary control (সেকেন্ডারি নিয়ন্ত্রণ)',
      dosage: 'মুভমেন্ট বন্ধ; গিয়ার জীবাণুমুক্ত; এয়ারেশন বাড়ান; প্রোবায়োটিক; কর্তৃপক্ষকে জানানো'
    },
    {
      id: 'iridovirus',
      name: 'Iridovirus-like সন্দেহ',
      symptoms: ['ফুলকা ফ্যাকাশে/নেক্রোসিস', 'ব্যাকটেরিয়া ছাড়া মৃত্যু'],
      treatment: 'Biosecurity (বায়োসিকিউরিটি), Water Quality (পানি মান)',
      dosage: 'কোয়ারেন্টাইন; অবনতি হলে আংশিক হারভেস্ট; সাইকেল শেষে ডিসইনফেকশন'
    },
    {
      id: 'swim_bladder_disorder',
      name: 'Swim Bladder Disorder',
      symptoms: ['একদিকে ভাসে', 'ডুবে থাকতে পারে না'],
      treatment: 'Vitamin C (ভিটামিন সি) + Vitamin E (ভিটামিন ই); Pellet check',
      dosage: 'Vit C ৫০০–১০০০ mg/kg; Vit E ১০০–২০০ mg/kg; ১২–২৪ ঘন্টা উপবাস, পরে হালকা ফিড'
    },
    {
      id: 'mineral_deficiency',
      name: 'Mineral/Vit Deficiency',
      symptoms: ['মেরুদণ্ড বাঁকানো', 'চোয়াল বিকৃতি', 'খারাপ গ্রোথ'],
      treatment: 'Balanced Starter Feed (ব্যালান্সড স্টার্টার), Premix (প্রিমিক্স)',
      dosage: 'স্টার্টার ৩৮–৪২% প্রোটিন; ভিট-মিন প্রিমিক্স লেবেলমতো; তাপমাত্রা ঠিক রাখা'
    },
    {
      id: 'reproductive_inflammation',
      name: 'Reproductive Tract Inflammation/Parasitism',
      symptoms: ['ডিম্বাশয়/টেস্টিসে প্রদাহ/সিস্ট'],
      treatment: 'Water exchange (পানি বদল), Probiotics (প্রোবায়োটিক), Vet consult',
      dosage: 'পানি ২০–৩০% বদল; প্রোবায়োটিক লেবেলমতো'
    },
    {
      id: 'gas_bubble_disease',
      name: 'Gas Bubble Disease',
      symptoms: ['পাখনা/চোখে গ্যাস বাবল', 'নতুন পাম্পের পর'],
      treatment: 'Vent lines (ভেন্টিং), Pressure ↓, Aeration Cascade',
      dosage: 'প্লাম্বিং ঠিক; স্প্ল্যাশ/ক্যাসকেড এয়ারেশন; ২৪ ঘন্টা ফিড বন্ধ'
    },
    {
      id: 'ph_stress',
      name: 'pH Stress',
      symptoms: ['বৃষ্টির পর গণভেসে ওঠা', 'pH ওঠানামা'],
      treatment: 'Agricultural Lime (কৃষি চুন), Controlled Exchange',
      dosage: 'pH<7 হলে চুন ১–২ কেজি/ডেসিমেল; দুপুরে চুন নয়; পানি ২০–৩০% বদল'
    },
    {
      id: 'columnaris',
      name: 'Columnaris',
      symptoms: ['ফুলকা বাদামী নেক্রোসিস', 'স্যাডলব্যাক ক্ষত'],
      treatment: 'KMnO₄ (পটাশ), Oxytetracycline—OTC (অক্সিটেট্রাসাইক্লিন), Organic load ↓',
      dosage: 'KMnO₄ ২ গ্রা/ডেসিমেল; OTC ৫০–৭৫ mg/kg/দিন ×৫; সাইফন বর্জ্য'
    },
    {
      id: 'nutritional_deficit',
      name: 'Nutritional Deficit/Bacterial Keratitis',
      symptoms: ['চোখ ঘোলা', 'কর্নিয়া অস্বচ্ছ', 'অলস'],
      treatment: 'Vitamin A/E/C Premix (ভিট A/E/C), Florfenicol (সংক্রমণে)',
      dosage: 'Vit প্রিমিক্স লেবেলমতো; ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫'
    },
    {
      id: 'systemic_infection',
      name: 'Systemic Infection/Septicemia',
      symptoms: ['প্লীহা খুব বড়', 'কিডনিতে পিটেকিয়াল'],
      treatment: 'Florfenicol (ফ্লরফেনিকল), KMnO₄ (পটাশ), Water Improve',
      dosage: 'ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫; KMnO₄ ২ গ্রা/ডেসিমেল'
    },
    {
      id: 'bacterial_gill_disease',
      name: 'Bacterial Gill Disease/Flexibacter-like',
      symptoms: ['মুখের চারপাশে সাদা প্লাক', 'ভিড় ট্যাঙ্কে মৃত্যু'],
      treatment: 'Reduce Biomass (বায়োমাস কমানো), KMnO₄ (পটাশ), OTC',
      dosage: 'স্টক পাতলা; KMnO₄ ২ গ্রা/ডেসিমেল; OTC ৫০–৭৫ mg/kg/দিন ×৫'
    },
    {
      id: 'internal_protozoa',
      name: 'Internal Protozoa (Hexamita/Spironucleus)',
      symptoms: ['খাওয়া চললেও শুকিয়ে যাওয়া', 'অন্ত্র ফ্যাকাশে'],
      treatment: 'Metronidazole (মেট্রোনিডাজল; আইনসিদ্ধ হলে), Probiotics',
      dosage: 'মেট্রোনিডাজল ২৫ mg/kg দিনে ২ বার ×৩–৫; প্রোবায়োটিক লেবেলমতো'
    },
    {
      id: 'cold_stress',
      name: 'Cold Stress',
      symptoms: ['শীতে অলস', 'তলায় জট', 'ক্ষুধা কম'],
      treatment: 'Reduce Feeding (খাবার কম), Midday Feeding (দুপুরে), Aeration/Depth ↑',
      dosage: '১২–২ টায় একবার; হ্যান্ডলিং এড়ান; গভীর অংশ রাখুন'
    },
    {
      id: 'heat_stress',
      name: 'Heat Stress/Sunburn',
      symptoms: ['দুপুরে উপরে', 'ফ্যাকাশে প্যাচ', '>32–34°C'],
      treatment: 'Shade (ছায়া), Aeration (এয়ারেশন), Ration ↓',
      dosage: 'খাবার ২০–৩০% কম; স্প্ল্যাশ এয়ারেশন; শেড/পন্ড ডাই লেবেলমতো'
    },
    {
      id: 'handling_stress',
      name: 'Handling Stress/Injury',
      symptoms: ['আঁশ ক্ষতি', 'আঘাত', 'জালের পর দেরিতে মৃত্যু'],
      treatment: 'Salt in Transport Water (বহন জলে লবণ), Minimize Air Exposure',
      dosage: 'লবণ ২–৩ গ্রা/লিটার; অক্সিজেনেশন; নরম হ্যান্ডলিং'
    },
    {
      id: 'h2s_poisoning',
      name: 'H₂S Poisoning (স্লাজ)',
      symptoms: ['তলায় গণমৃত্যু', 'ফুলকা কালো', 'পচা ডিমের গন্ধ'],
      treatment: 'Don\'t Stir Sludge (স্লাজ নাড়াবেন না), Aerate, Lime, Exchange',
      dosage: 'তাৎক্ষণিক এয়ারেশন; চুন ১–২ কেজি/ডেসিমেল (তীর ঘেঁষে); ৩০–৫০% পানি বদল'
    },
    {
      id: 'cyanobacteria_toxins',
      name: 'Cyanobacteria Toxins',
      symptoms: ['সবুজ পেইন্ট-সদৃশ স্কাম', 'ব্লুম ক্রাশের পর মৃত্যু'],
      treatment: 'Exchange (বদল), Shading (শেডিং), Probiotics; Fry থাকলে Copper Avoid',
      dosage: '৩০–৫০% বদল; ডাই/শেড লেবেলমতো; প্রোবায়োটিক; মনিটর'
    },
    {
      id: 'mixed_infection',
      name: 'Mixed Infection',
      symptoms: ['আলসার + প্লীহা বড় + ফুলকা ফ্যাকাশে'],
      treatment: 'Parasite First → Bacteria Then; Water Improve',
      dosage: 'লবণ ডিপ/KMnO₄; পরে ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫; প্রোবায়োটিক'
    },
    {
      id: 'iron_precipitation',
      name: 'Iron Precipitation Irritation',
      symptoms: ['টিউবওয়েল ইনফ্লোতে ফুলকায় লালচে-বাদামী স্তর'],
      treatment: 'Aerate Inflow (ইনফ্লো এয়ারেশন), Settling Tank (সেটলিং)',
      dosage: 'ক্যাসকেড এয়ারেশন; প্রি-সেটল করে পুকুরে দিন'
    },
    {
      id: 'overfeeding',
      name: 'Overfeeding/Temporary Buoyancy',
      symptoms: ['অতিভোজনের পর পেট-উপরে ভাসা', 'অন্ত্র ভরা'],
      treatment: 'Fasting (উপবাস), Small Frequent Feeds',
      dosage: '১২–২৪ ঘন্টা ফিড বন্ধ; পরে ৭০–৮০% রেশন, দিনে ২–৩ বার'
    },
    {
      id: 'vitamin_c_deficiency',
      name: 'Vitamin C Deficiency',
      symptoms: ['পাখনা ভঙ্গুর', 'ক্ষত সারতে দেরি'],
      treatment: 'Vitamin C Premix (ভিটামিন সি প্রিমিক্স)',
      dosage: '৫০০–১০০০ mg Vit C/কেজি ফিড ×২–৪ সপ্তাহ'
    },
    {
      id: 'black_spot_disease',
      name: 'Black Spot Disease (Metacercaria)',
      symptoms: ['ত্বকের নিচে গোলমরিচ দাগ'],
      treatment: 'Break Bird/Snail Cycle (পাখি/শামুক নিয়ন্ত্রণ), Lime, Drying',
      dosage: 'পুকুর শুকানো; চুন ১–২ কেজি/ডেসিমেল; শামুক নিয়ন্ত্রণ'
    },
    {
      id: 'chronic_anemia',
      name: 'Chronic Anemia',
      symptoms: ['ফুলকা ফ্যাকাশে', 'রক্ত পাতলা', 'গ্রোথ স্লো'],
      treatment: 'Check Feed, Deworm (কৃমিনাশক), Vit-Min',
      dosage: 'Fenbendazole (ফেনবেনডাজল) ১০ mg/kg ফিড ×৩; ভিট-মিন প্রিমিক্স'
    },
    {
      id: 'mouth_rot',
      name: 'Mouth Rot (ব্যাকটেরিয়াল)',
      symptoms: ['মুখের কিনারা ক্ষয়', 'খেতে কষ্ট'],
      treatment: 'Medicated Feed (অ্যান্টিবায়োটিক ফিড), Povidone-Iodine (আইডিন)',
      dosage: 'Florfenicol (ফ্লরফেনিকল) ১০–১৫ mg/kg/দিন ×৫; ক্ষতে ১–২% আয়োডিন (পুকুরে নয়)'
    },
    {
      id: 'gill_hyperplasia',
      name: 'Gill Hyperplasia (ইরিট্যান্ট)',
      symptoms: ['ফুলকা পুরু', 'গ্যাস এক্সচেঞ্জ কম', 'পরজীবী নেই'],
      treatment: 'Water Improve, Reduce Organics, Mild KMnO₄',
      dosage: 'স্লাজ সাইফন; KMnO₄ ২ গ্রা/ডেসিমেল; টার্নওভার বাড়ান'
    },
    {
      id: 'streptococcus',
      name: 'Streptococcus agalactiae/iniae',
      symptoms: ['গরমে অলস', 'ঘূর্ণি', 'পপ-আই', 'রক্তক্ষরণ', 'স্নায়বিক সাইন'],
      treatment: 'Florfenicol (ফ্লরফেনিকল) / Oxytetracycline (অক্সিটেট্রাসাইক্লিন), Vaccination (ভ্যাকসিন—প্রিভেনশন)',
      dosage: 'ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫–৭; ভবিষ্যতে ভ্যাকসিন প্রোগ্রাম বিবেচনা'
    },
    {
      id: 'edwardsiella',
      name: 'Edwardsiella tarda/ictaluri',
      symptoms: ['আলসার + লিভার/কিডনিতে অ্যাবসেস', 'উচ্চ মৃত্যু'],
      treatment: 'Medicated feed per antibiogram (ল্যাব-সংবেদনশীলতা অনুযায়ী)',
      dosage: 'ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫–৭; ল্যাব সেনসিটিভিটি সুপারিশ'
    },
    {
      id: 'columnaris_2',
      name: 'Columnaris',
      symptoms: ['পাখনার কিনারা সাদা/ক্ষয়', 'স্যাডলব্যাক', 'উষ্ণ জলে বেশি'],
      treatment: 'KMnO₄ (পটাশ), OTC (অক্সিটেট্রাসাইক্লিন)',
      dosage: 'KMnO₄ ২ গ্রা/ডেসিমেল; OTC ৫০–৭৫ mg/kg/দিন ×৫'
    },
    {
      id: 'saprolegnia_eggs',
      name: 'Saprolegnia on Eggs',
      symptoms: ['হ্যাচারি ট্রেতে ডিমে তুলার মতো বৃদ্ধি'],
      treatment: 'Hydrogen Peroxide—H₂O₂ (হাইড্রোজেন পারঅক্সাইড), Acriflavine (অ্যাক্রিফ্লাভিন)',
      dosage: 'H₂O₂ ৫০০–১০০০ ppm স্বল্প সময়; SOP মেনে চলুন'
    },
    {
      id: 'argulus_bacteria',
      name: 'Argulus + Secondary Bacteria',
      symptoms: ['একই দেহে বহু উকুন + আলসার'],
      treatment: 'First Trichlorfon (ট্রাইক্লোরফন), Then Antibiotic Feed (অ্যান্টিবায়োটিক ফিড)',
      dosage: 'ট্রাইক্লোরফন ০.২৫–০.৫ mg/L; এরপর ফ্লরফেনিকল ১০–১৫ mg/kg/দিন ×৫'
    },
    {
      id: 'osmotic_shock',
      name: 'Osmotic/pH Shock',
      symptoms: ['ভারি বৃষ্টি/টপ-আপের পর গা ঘষা', 'মিউকাস', 'মৃত্যু'],
      treatment: 'Salt (লবণ), Agricultural Lime (চুন), Gradual Exchange (ধীরে বদল)',
      dosage: 'লবণ ১–২ কেজি/ডেসিমেল; চুন ১–২ কেজি/ডেসিমেল; হঠাৎ ইনফ্লো এড়ান'
    },
    {
      id: 'organophosphate_poisoning',
      name: 'Organophosphate/Pyrethroid Poisoning',
      symptoms: ['কৃষি রান-অফের পর গণমৃত্যু', 'খিঁচুনি'],
      treatment: 'Stop Inflow (ইনফ্লো বন্ধ), Exchange (পানি বদল), Activated Carbon Screen (অ্যাক্টিভেটেড কার্বন)',
      dosage: '৫০–৮০% পানি বদল; ইনলেটে কার্বন ১০–২০ গ্রা/মি³; প্রতিবেশীকে সতর্ক করুন'
    },
    {
      id: 'healthy',
      name: 'স্বাস্থ্যকর অবস্থা',
      symptoms: [],
      treatment: 'কোনো চিকিৎসার প্রয়োজন নেই',
      dosage: 'ভালো খাবার এবং পরিচর্যা বজায় রাখুন'
    }
  ]
};

interface SelectedOrgan {
  id: string;
  name: string;
  conditions: string[];
}

interface Diagnosis {
  disease: string;
  confidence: number;
  treatment: string;
  dosage: string;
}

export default function MedicalDiagnosticPage() {
  const [selectedPond, setSelectedPond] = useState<Pond | null>(null);
  const [selectedOrgans, setSelectedOrgans] = useState<SelectedOrgan[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableDiagnosis, setEditableDiagnosis] = useState<Diagnosis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDiagnostic, setSavedDiagnostic] = useState<MedicalDiagnostic | null>(null);
  const [savedDiagnostics, setSavedDiagnostics] = useState<MedicalDiagnostic[]>([]);

  // Fetch real ponds data from API
  const { data: pondsData, isLoading: pondsLoading } = usePonds();
  const ponds = extractApiData<Pond>(pondsData);

  // Fetch saved diagnostics on component mount
  useEffect(() => {
    fetchSavedDiagnostics();
  }, []);

  const handleOrganSelect = (organId: string) => {
    const organ = medicalData.organs.find(o => o.id === organId);
    if (!organ) return;

    const existingOrgan = selectedOrgans.find(o => o.id === organId);
    if (existingOrgan) {
      setSelectedOrgans(selectedOrgans.filter(o => o.id !== organId));
    } else {
      setSelectedOrgans([...selectedOrgans, { id: organId, name: organ.name, conditions: [] }]);
    }
  };

  const handleConditionSelect = (organId: string, condition: string) => {
    setSelectedOrgans(prev => prev.map(organ => {
      if (organ.id === organId) {
        const hasCondition = organ.conditions.includes(condition);
        return {
          ...organ,
          conditions: hasCondition 
            ? organ.conditions.filter(c => c !== condition)
            : [...organ.conditions, condition]
        };
      }
      return organ;
    }));
  };

  const analyzeSymptoms = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const allConditions = selectedOrgans.flatMap(organ => organ.conditions);
      
      if (allConditions.length === 0) {
        setDiagnosis({
          disease: 'কোনো লক্ষণ নির্বাচন করা হয়নি',
          confidence: 0,
          treatment: 'অনুগ্রহ করে লক্ষণ নির্বাচন করুন',
          dosage: ''
        });
        setIsAnalyzing(false);
        return;
      }

      // Check for healthy conditions only
      const healthyConditions = selectedOrgans.every(organ => 
        organ.conditions.every(condition => 
          medicalData.conditions[organ.id as keyof typeof medicalData.conditions]?.healthy.includes(condition)
        )
      );

      if (healthyConditions) {
        setDiagnosis({
          disease: 'স্বাস্থ্যকর অবস্থা',
          confidence: 95,
          treatment: 'কোনো চিকিৎসার প্রয়োজন নেই। ভালো খাবার এবং পরিচর্যা বজায় রাখুন।',
          dosage: 'নিয়মিত পানি পরিবর্তন এবং মানসম্পন্ন খাবার দিন।'
        });
        setIsAnalyzing(false);
        return;
      }

      // Enhanced matching algorithm that properly handles multiple organs
      const diseaseMatches = medicalData.diseases
        .filter(disease => disease.id !== 'healthy')
        .map(disease => {
          let score = 0;
          let exactMatches = 0;
          let partialMatches = 0;
          let organMatches = 0;
          const symptomMatches = [];
          
          // Check each selected organ's conditions against disease symptoms
          for (const organ of selectedOrgans) {
            let organHasMatch = false;
            const organSymptomMatches = [];
            
            for (const condition of organ.conditions) {
              // Check for exact symptom matches
              const exactMatch = disease.symptoms.some(symptom => 
                condition.toLowerCase() === symptom.toLowerCase()
              );
              
              if (exactMatch) {
                exactMatches++;
                score += 20; // Higher score for exact matches
                organHasMatch = true;
                organSymptomMatches.push({ condition, match: 'exact' });
              } else {
                // Check for partial matches with better keyword matching
                const partialMatch = disease.symptoms.some(symptom => {
                  const conditionLower = condition.toLowerCase();
                  const symptomLower = symptom.toLowerCase();
                  
                  // Direct substring match
                  if (conditionLower.includes(symptomLower) || symptomLower.includes(conditionLower)) {
                    return true;
                  }
                  
                  // Keyword matching
                  const conditionWords = conditionLower.split(/[\s,;]+/).filter(w => w.length > 2);
                  const symptomWords = symptomLower.split(/[\s,;]+/).filter(w => w.length > 2);
                  
                  const hasKeywordMatch = conditionWords.some(cw => 
                    symptomWords.some(sw => 
                      cw.includes(sw) || sw.includes(cw) ||
                      // Common Bengali medical terms
                      (cw === 'ফুলকা' && sw === 'gill') ||
                      (cw === 'চোখ' && sw === 'eye') ||
                      (cw === 'ত্বক' && sw === 'skin') ||
                      (cw === 'যকৃত' && sw === 'liver') ||
                      (cw === 'অন্ত্র' && sw === 'intestine') ||
                      (cw === 'প্লীহা' && sw === 'spleen') ||
                      (cw === 'কিডনি' && sw === 'kidney') ||
                      (cw === 'মস্তিষ্ক' && sw === 'brain') ||
                      (cw === 'মাংসপেশি' && sw === 'muscle')
                    )
                  );
                  
                  return hasKeywordMatch;
                });
                
                if (partialMatch) {
                  partialMatches++;
                  score += 10; // Good score for partial matches
                  organHasMatch = true;
                  organSymptomMatches.push({ condition, match: 'partial' });
                }
              }
            }
            
            if (organHasMatch) {
              organMatches++;
              symptomMatches.push({
                organ: organ.name,
                matches: organSymptomMatches
              });
            }
          }
          
          // Calculate confidence based on matches and organ involvement
          const totalSymptoms = disease.symptoms.length;
          const totalConditions = allConditions.length;
          
          // More sophisticated confidence calculation
          let confidence = 0;
          if (exactMatches > 0) {
            confidence += (exactMatches / totalConditions) * 60; // Exact matches are very important
          }
          if (partialMatches > 0) {
            confidence += (partialMatches / totalConditions) * 30; // Partial matches are good
          }
          
          // Organ involvement bonus
          if (organMatches > 1) {
            confidence += Math.min(20, (organMatches - 1) * 10); // Bonus for multi-organ involvement
          }
          
          // Penalty for diseases with very few symptoms if many conditions selected
          if (totalSymptoms < 3 && totalConditions > 5) {
            confidence = Math.max(0, confidence - 15);
          }
          
          // Bonus for diseases that typically affect multiple organs
          const multiOrganDiseases = ['bacterial_septicemia', 'systemic_infection', 'mixed_infection', 'tilv', 'iridovirus', 'streptococcus', 'edwardsiella'];
          if (multiOrganDiseases.includes(disease.id) && organMatches > 1) {
            confidence += 15;
          }
          
          // Ensure confidence is between 0 and 95
          confidence = Math.min(95, Math.max(0, Math.round(confidence)));
          
          return {
            disease,
            score,
            confidence,
            exactMatches,
            partialMatches,
            organMatches,
            symptomMatches
          };
        })
        .filter(match => match.confidence > 0)
        .sort((a, b) => {
          // Primary sort by confidence, secondary by exact matches, tertiary by organ matches
          if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
          }
          if (b.exactMatches !== a.exactMatches) {
            return b.exactMatches - a.exactMatches;
          }
          if (b.organMatches !== a.organMatches) {
            return b.organMatches - a.organMatches;
          }
          return b.score - a.score;
        });

      if (diseaseMatches.length === 0) {
        setDiagnosis({
          disease: 'অজানা রোগ/অবস্থা',
          confidence: 0,
          treatment: 'একজন পশুচিকিৎসকের পরামর্শ নিন। লক্ষণগুলি আরও বিশদভাবে পর্যবেক্ষণ করুন।',
          dosage: 'পানি মান পরীক্ষা করুন এবং মাছের আচরণ মনিটর করুন।'
        });
        setIsAnalyzing(false);
        return;
      }

      const bestMatch = diseaseMatches[0];
      
      // If confidence is very low, suggest multiple possibilities
      if (bestMatch.confidence < 30 && diseaseMatches.length > 1) {
        const topMatches = diseaseMatches.slice(0, 3);
        const diseaseNames = topMatches.map(m => m.disease.name).join(', ');
        
        setDiagnosis({
          disease: `সম্ভাব্য রোগ: ${diseaseNames}`,
          confidence: bestMatch.confidence,
          treatment: `প্রাথমিক চিকিৎসা: ${bestMatch.disease.treatment}`,
          dosage: `ডোজ: ${bestMatch.disease.dosage}। অন্যান্য সম্ভাবনা: ${topMatches.slice(1).map(m => m.disease.name).join(', ')}`
        });
      } else {
        // Add organ involvement info for better diagnosis
        const organInfo = selectedOrgans.length > 1 ? 
          ` (${selectedOrgans.length}টি অঙ্গে লক্ষণ: ${selectedOrgans.map(o => o.name).join(', ')})` : '';
        
        // Add symptom matching info for debugging
        const symptomInfo = bestMatch.symptomMatches && bestMatch.symptomMatches.length > 0 ? 
          `\n\nমিলে যাওয়া লক্ষণ:\n${bestMatch.symptomMatches.map(organMatch => 
            `${organMatch.organ}: ${organMatch.matches.map(m => m.condition).join(', ')}`
          ).join('\n')}` : '';
        
        setDiagnosis({
          disease: bestMatch.disease.name + organInfo,
          confidence: bestMatch.confidence,
          treatment: bestMatch.disease.treatment,
          dosage: bestMatch.disease.dosage + symptomInfo
        });
      }
      
      setIsAnalyzing(false);
    }, 2000);
  };

  const resetDiagnosis = () => {
    setSelectedPond(null);
    setSelectedOrgans([]);
    setDiagnosis(null);
    setIsEditing(false);
    setEditableDiagnosis(null);
    setSavedDiagnostic(null);
  };

  const startEditing = () => {
    if (diagnosis) {
      setEditableDiagnosis({ ...diagnosis });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditableDiagnosis(null);
  };

  const updateEditableDiagnosis = (field: keyof Diagnosis, value: string | number) => {
    if (editableDiagnosis) {
      setEditableDiagnosis({
        ...editableDiagnosis,
        [field]: value
      });
    }
  };

  const saveDiagnosticToDatabase = async (diagnosisToSave?: Diagnosis) => {
    if (!selectedPond) return;

    const diagnosisData = diagnosisToSave || editableDiagnosis;
    if (!diagnosisData) return;

    setIsSaving(true);
    try {
      const diagnosticData = {
        pond: selectedPond.id,
        disease_name: diagnosisData.disease,
        confidence_percentage: diagnosisData.confidence.toString(),
        recommended_treatment: diagnosisData.treatment,
        dosage_application: diagnosisData.dosage,
        selected_organs: selectedOrgans.map(organ => ({
          id: organ.id,
          name: organ.name,
          conditions: organ.conditions
        })),
        selected_symptoms: selectedOrgans.flatMap(organ => organ.conditions),
        notes: ''
      };

      const response = await api.post('/medical-diagnostics/', diagnosticData);
      setSavedDiagnostic(response.data);
      
      if (editableDiagnosis) {
        setDiagnosis(editableDiagnosis);
        setIsEditing(false);
        setEditableDiagnosis(null);
      }
      
      // Refresh the diagnostics list
      fetchSavedDiagnostics();
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      alert('চিকিৎসা সংরক্ষণে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSavedDiagnostics = async () => {
    try {
      const response = await api.get('/medical-diagnostics/');
      setSavedDiagnostics(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    }
  };

  const saveWithoutEditing = () => {
    if (diagnosis) {
      saveDiagnosticToDatabase(diagnosis);
    }
  };

  const applyTreatment = async () => {
    if (!savedDiagnostic) return;

    try {
      await api.post(`/medical-diagnostics/${savedDiagnostic.id}/apply_treatment/`);
      setSavedDiagnostic({
        ...savedDiagnostic,
        is_applied: true,
        applied_at: new Date().toISOString()
      });
      alert('চিকিৎসা প্রয়োগ করা হয়েছে!');
    } catch (error) {
      console.error('Error applying treatment:', error);
      alert('চিকিৎসা প্রয়োগে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          🐟 মাছের চিকিৎসা ডায়াগনস্টিক সহায়ক
        </h1>
        <p className="text-center text-gray-600">
          পুকুর নির্বাচন করুন, অঙ্গ নির্বাচন করুন এবং লক্ষণগুলি চিহ্নিত করুন রোগ নির্ণয়ের জন্য
        </p>
        <div className="text-center mt-4">
          <Link href="/medical-diagnostics">
            <Button
              variant="outline"
              className="flex items-center gap-2 text-white"
            >
              <Brain className="h-4 w-4" />
              সংরক্ষিত রোগ নির্ণয় দেখুন
            </Button>
          </Link>
        </div>
      </div>

      {/* Pond Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏞️</span>
            পুকুর নির্বাচন করুন
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pondsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">পুকুরের তালিকা লোড হচ্ছে...</span>
            </div>
          ) : ponds.length === 0 ? (
            <div className="text-center py-8">
              <Fish className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">কোনো পুকুর নেই</h3>
              <p className="mt-1 text-sm text-gray-500">প্রথমে একটি পুকুর তৈরি করুন</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ponds.map(pond => (
                  <Button
                    key={pond.id}
                    variant={selectedPond?.id === pond.id ? "default" : "outline"}
                    onClick={() => setSelectedPond(pond)}
                    className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                  >
                    <div className={`font-semibold ${selectedPond?.id === pond.id ? 'text-black' : 'text-white'}`}>{pond.name}</div>
                    <div className={`text-sm opacity-90 flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-black' : 'text-white'}`}>
                      <Droplets className="h-3 w-3" />
                      আকার: {parseFloat(pond.area_decimal).toFixed(3)} ডেসিমেল
                    </div>
                    <div className={`text-sm opacity-90 flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-black' : 'text-white'}`}>
                      <Activity className="h-3 w-3" />
                      গভীরতা: {parseFloat(pond.depth_ft).toFixed(1)} ফুট
                    </div>
                    <div className={`text-sm opacity-90 flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-black' : 'text-white'}`}>
                      <Fish className="h-3 w-3" />
                      আয়তন: {parseFloat(pond.volume_m3).toFixed(1)} m³
                    </div>
                    {pond.location && (
                      <div className={`text-sm opacity-90 flex items-center gap-1 ${selectedPond?.id === pond.id ? 'text-black' : 'text-white'}`}>
                        <MapPin className="h-3 w-3" />
                        {pond.location}
                      </div>
                    )}
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      pond.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pond.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </div>
                  </Button>
                ))}
              </div>
              
              {selectedPond && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>নির্বাচিত পুকুর:</strong> {selectedPond.name} ({parseFloat(selectedPond.area_decimal).toFixed(3)} ডেসিমেল) - {selectedPond.location || 'অবস্থান উল্লেখ নেই'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {selectedPond && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organ Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                অঙ্গ নির্বাচন করুন
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {medicalData.organs.map(organ => (
                  <Button
                    key={organ.id}
                    variant={selectedOrgans.some(o => o.id === organ.id) ? "default" : "outline"}
                    onClick={() => handleOrganSelect(organ.id)}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <span className="text-2xl">{organ.icon}</span>
                    <span className={`text-sm text-center ${selectedOrgans.some(o => o.id === organ.id) ? 'text-black' : 'text-white'}`}>{organ.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Condition Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                লক্ষণ নির্বাচন করুন
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedOrgans.map(organ => (
                  <div key={organ.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {medicalData.organs.find(o => o.id === organ.id)?.icon} {organ.name}
                    </h4>
                    
                    {/* Healthy Conditions */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        স্বাস্থ্যকর লক্ষণ
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {medicalData.conditions[organ.id as keyof typeof medicalData.conditions]?.healthy.map(condition => (
                          <Button
                            key={condition}
                            variant={organ.conditions.includes(condition) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleConditionSelect(organ.id, condition)}
                            className={`text-xs ${organ.conditions.includes(condition) ? 'text-black' : 'text-white'}`}
                          >
                            {condition}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Unhealthy Conditions */}
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        অসুস্থ/অস্বাভাবিক লক্ষণ
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {medicalData.conditions[organ.id as keyof typeof medicalData.conditions]?.unhealthy.map(condition => (
                          <Button
                            key={condition}
                            variant={organ.conditions.includes(condition) ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleConditionSelect(organ.id, condition)}
                            className={`text-xs ${organ.conditions.includes(condition) ? 'text-black' : 'text-white'}`}
                          >
                            {condition}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedOrgans.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    প্রথমে অঙ্গ নির্বাচন করুন
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Button */}
      {selectedPond && (
        <div className="mt-6 text-center">
          <Button
            onClick={analyzeSymptoms}
            disabled={selectedOrgans.length === 0 || isAnalyzing}
            size="lg"
            className="px-8"
          >
            {isAnalyzing ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                বিশ্লেষণ চলছে...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                রোগ নির্ণয় করুন
              </>
            )}
          </Button>
          
          {(selectedOrgans.length > 0 || selectedPond) && (
            <Button
              variant="outline"
              onClick={resetDiagnosis}
              className="ml-4 text-white"
            >
              রিসেট করুন
            </Button>
          )}
        </div>
      )}

      {!selectedPond && (
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-lg">
            রোগ নির্ণয় শুরু করতে প্রথমে একটি পুকুর নির্বাচন করুন
          </p>
        </div>
      )}

      {/* Diagnosis Results */}
      {diagnosis && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                রোগ নির্ণয়ের ফলাফল
              </CardTitle>
              {!isEditing && !savedDiagnostic && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveWithoutEditing()}
                    disabled={isSaving}
                    className="flex items-center gap-2 text-white"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="flex items-center gap-2 text-white"
                  >
                    <Edit3 className="h-4 w-4" />
                    সম্পাদনা করুন
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPond && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>পুকুর:</strong> {selectedPond.name} ({parseFloat(selectedPond.area_decimal).toFixed(3)} ডেসিমেল) - {selectedPond.location || 'অবস্থান উল্লেখ নেই'}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {isEditing ? (
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">রোগের নাম:</label>
                  <input
                    type="text"
                    value={editableDiagnosis?.disease || ''}
                    onChange={(e) => updateEditableDiagnosis('disease', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              ) : (
                <h3 className="text-xl font-semibold">{diagnosis.disease}</h3>
              )}
              {/* <Badge variant={diagnosis.confidence > 70 ? "default" : "secondary"}>
                {diagnosis.confidence}% নিশ্চিত
              </Badge> */}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>সুপারিশকৃত চিকিৎসা:</strong>
                {isEditing ? (
                  <textarea
                    value={editableDiagnosis?.treatment || ''}
                    onChange={(e) => updateEditableDiagnosis('treatment', e.target.value)}
                    className="w-full mt-2 p-2 border rounded-md"
                    rows={3}
                  />
                ) : (
                  ` ${diagnosis.treatment}`
                )}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">ডোজ ও প্রয়োগ:</h4>
              {isEditing ? (
                <textarea
                  value={editableDiagnosis?.dosage || ''}
                  onChange={(e) => updateEditableDiagnosis('dosage', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={4}
                />
              ) : (
                <p className="text-sm">{diagnosis.dosage}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button
                  onClick={() => saveDiagnosticToDatabase()}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  className="flex items-center gap-2 text-white"
                >
                  <X className="h-4 w-4" />
                  বাতিল
                </Button>
              </div>
            )}

            {savedDiagnostic && !isEditing && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-medium">চিকিৎসা সংরক্ষণ করা হয়েছে</p>
                    <p className="text-sm text-green-600">
                      সংরক্ষণের সময়: {new Date(savedDiagnostic.created_at).toLocaleString('bn-BD')}
                    </p>
                  </div>
                  <Button
                    onClick={applyTreatment}
                    disabled={savedDiagnostic.is_applied}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {savedDiagnostic.is_applied ? 'চিকিৎসা প্রয়োগ হয়েছে' : 'চিকিৎসা প্রয়োগ করুন'}
                  </Button>
                </div>
                {savedDiagnostic.is_applied && savedDiagnostic.applied_at && (
                  <p className="text-sm text-green-600 mt-2">
                    প্রয়োগের সময়: {new Date(savedDiagnostic.applied_at).toLocaleString('bn-BD')}
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg">
              <strong>সতর্কতা:</strong> এটি একটি প্রাথমিক ডায়াগনস্টিক টুল। গুরুতর ক্ষেত্রে একজন পশুচিকিৎসকের পরামর্শ নিন।
            </div>
            
            {diagnosis.confidence < 50 && (
              <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg mt-2">
                <strong>পরামর্শ:</strong> নিশ্চিত রোগ নির্ণয়ের জন্য মাইক্রোস্কোপিক পরীক্ষা, পানি মান পরীক্ষা এবং পশুচিকিৎসকের পরামর্শ নিন।
              </div>
            )}
            
            {diagnosis.confidence > 80 && (
              <div className="text-xs text-green-600 bg-green-50 p-3 rounded-lg mt-2">
                <strong>সুপারিশ:</strong> এই রোগের জন্য উপরের চিকিৎসা পদ্ধতি অনুসরণ করুন। উন্নতি না হলে পুনরায় পরীক্ষা করুন।
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
