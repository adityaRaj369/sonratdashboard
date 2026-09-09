import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@sonrat.ai" },
    update: {},
    create: {
      email: "demo@sonrat.ai",
      name: "Demo Owner",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      timezone: "Asia/Kolkata",
      featureFlags: {
        voice_runtime: true,
        campaigns: true,
        inbound_calls: true,
        recordings: true,
        analytics: true,
        human_transfer: true,
      },
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  const draftConfig = {
    general: {
      name: "Ava",
      description: "Outbound sales voice agent",
      role: "Sales Development Representative",
      industry: "SaaS",
      purpose: "sales",
    },
    company: {
      companyName: "Demo Organization",
      companyDescription: "AI-powered customer engagement platform",
      website: "https://example.com",
      address: "Bangalore, India",
      contactEmail: "hello@example.com",
      contactPhone: "+919876543210",
      businessHours: [{ day: 1, open: "09:00", close: "18:00" }],
      timezone: "Asia/Kolkata",
      locations: ["Bangalore"],
    },
    products: [
      {
        name: "Sonrat Voice",
        description: "AI voice agents for sales and support",
        features: ["Multilingual", "Realtime"],
        benefits: ["Higher connect rates"],
        priceMinor: 9900,
        currency: "USD",
        pricingNotes: "Starts at $99/month",
        availability: "GA",
        eligibility: "Businesses",
        restrictions: "No medical advice",
      },
    ],
    knowledge: {
      faqs: [
        {
          question: "What is Sonrat?",
          answer: "An AI voice platform for sales and support.",
        },
      ],
      policies: ["Do not share customer data across accounts"],
      supportInformation: ["Support hours 9-6 IST"],
      salesInformation: ["Free trial available"],
      additionalKnowledge: [],
    },
    personality: {
      personality: "Warm and professional",
      tone: "Confident",
      friendliness: 8,
      professionalism: 9,
      verbosity: "concise",
      speakingStyle: "Natural conversational",
    },
    voice: {
      voiceProvider: "gemini",
      voiceId: "Puck",
      voiceGender: "neutral",
      language: "en",
      style: "clear",
      speed: 1,
    },
    languages: {
      supportedLanguages: ["en", "hi"],
      defaultLanguage: "en",
      languageDetection: true,
      languageSwitching: true,
      fallbackLanguage: "en",
    },
    sales: {
      primaryObjective: "Qualify interest and book a demo",
      secondaryObjectives: ["Capture budget range"],
      qualificationQuestions: ["What team size are you supporting?"],
      discoveryQuestions: ["What tools do you use today?"],
      offers: ["14-day trial"],
      objectionHandling: ["Acknowledge cost concerns and explain ROI"],
      closingBehavior: "Ask for a convenient demo time",
      leadQualificationRules: ["Must have buying interest"],
    },
    support: {
      supportWorkflows: ["Identify issue", "Verify account", "Resolve or escalate"],
      escalationRules: ["Escalate billing disputes"],
      humanHandoffRules: ["Transfer on explicit request"],
      prohibitedAnswers: ["Never invent refund approvals"],
      issueCategories: ["Billing", "Technical"],
    },
    safety: {
      prohibitedTopics: ["Politics", "Medical diagnosis"],
      unsupportedClaims: ["Guaranteed revenue increase"],
      privacyBehavior: "Never read back full payment card numbers",
      sensitiveInformationRules: ["Do not store OTPs in notes"],
      escalationRequirements: ["Legal requests"],
    },
    callBehavior: {
      greeting: "Hi, this is Ava from Demo Organization. Do you have a quick minute?",
      interruptionHandling: "Stop speaking immediately and listen.",
      silenceBehavior: "Ask a brief clarifying question after 5 seconds.",
      closing: "Thanks for your time. Have a great day.",
      maximumCallDurationSeconds: 600,
      callbackBehavior: "Offer callback in business hours",
      callEndRules: ["Objective complete", "Customer requests end"],
    },
    tools: {
      enabledTools: [
        "get_customer",
        "create_lead",
        "schedule_callback",
        "transfer_to_human",
        "end_call",
      ],
    },
  };

  let agent = await prisma.agent.findFirst({
    where: { organizationId: org.id, name: "Ava" },
  });

  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        organizationId: org.id,
        name: "Ava",
        description: "Demo sales agent",
        status: "PUBLISHED",
        draftConfig,
      },
    });

    const version = await prisma.agentVersion.create({
      data: {
        organizationId: org.id,
        agentId: agent.id,
        versionNumber: 1,
        status: "ACTIVE",
        config: draftConfig,
        systemPrompt: "Seeded prompt placeholder",
        publishedAt: new Date(),
      },
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: { activeVersionId: version.id },
    });
  }

  const phone = await prisma.phoneNumber.upsert({
    where: {
      organizationId_e164: {
        organizationId: org.id,
        e164: "+918035701000",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      e164: "+918035701000",
      displayName: "Demo Exotel Number",
      inboundAgentId: agent.id,
      provider: "mock",
    },
  });

  const contacts = [
    {
      name: "Riya Sharma",
      rawPhone: "+919811112222",
      normalizedPhone: "+919811112222",
      countryCode: "IN",
      email: "riya@example.com",
      company: "Northwind",
      tags: ["inbound"],
      source: "seed",
    },
    {
      name: "Alex Johnson",
      rawPhone: "+14155550123",
      normalizedPhone: "+14155550123",
      countryCode: "US",
      email: "alex@example.com",
      company: "Contoso",
      tags: ["outbound"],
      source: "seed",
    },
  ];

  for (const c of contacts) {
    await prisma.contact.upsert({
      where: {
        organizationId_normalizedPhone: {
          organizationId: org.id,
          normalizedPhone: c.normalizedPhone,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        ...c,
      },
    });
  }

  const existingCampaign = await prisma.campaign.findFirst({
    where: { organizationId: org.id, name: "Q1 Demo Outreach" },
  });

  if (!existingCampaign) {
    const version = await prisma.agentVersion.findFirst({
      where: { agentId: agent.id, status: "ACTIVE" },
    });
    const allContacts = await prisma.contact.findMany({
      where: { organizationId: org.id },
    });

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: org.id,
        name: "Q1 Demo Outreach",
        description: "Seeded demo campaign",
        agentId: agent.id,
        agentVersionId: version?.id,
        phoneNumberId: phone.id,
        status: "DRAFT",
        objective: "Book product demos",
        salesInstructions: "Be concise and helpful",
        timezone: "Asia/Kolkata",
      },
    });

    for (const contact of allContacts) {
      await prisma.campaignContact.create({
        data: {
          campaignId: campaign.id,
          contactId: contact.id,
        },
      });
    }
  }

  console.log("Seed complete");
  console.log("Login: demo@sonrat.ai / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
