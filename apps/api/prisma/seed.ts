import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Referral milestones — reward ladder for total lifetime invites (count-guarded
  // independently so they seed even on a DB that already has other quests).
  const milestones = [
    {
      title: "3 دعوت موفق",
      icon: "🥉",
      verifyTarget: 3,
      rewardScore: 0,
      rewardRounds: 2,
    },
    {
      title: "5 دعوت موفق",
      icon: "⭐",
      verifyTarget: 5,
      rewardScore: 300,
      rewardRounds: 0,
    },
    {
      title: "10 دعوت موفق",
      icon: "🥈",
      verifyTarget: 10,
      rewardScore: 0,
      rewardRounds: 5,
    },
    {
      title: "20 دعوت موفق",
      icon: "🥇",
      verifyTarget: 20,
      rewardScore: 1000,
      rewardRounds: 0,
    },
    {
      title: "50 دعوت موفق",
      icon: "🏆",
      verifyTarget: 50,
      rewardScore: 2000,
      rewardRounds: 0,
    },
  ];
  for (const m of milestones) {
    const exists = await prisma.quest.findFirst({
      where: {
        verify: "REFERRAL_SIGNUPS",
        verifyTarget: m.verifyTarget,
        title: m.title,
      },
    });
    if (!exists) {
      await prisma.quest.create({
        data: {
          title: m.title,
          icon: m.icon,
          description:
            m.rewardRounds > 0
              ? `${m.verifyTarget} تا از دوستان خود را دعوت کنید و بعد از ثبت نام آنها ${m.rewardRounds} دور اضافه دریافت کنید.`
              : `${m.verifyTarget} تا از دوستان خود را دعوت کنید و بعد از ثبت نام آنها ${m.rewardScore} امتیاز دریافت کنید.`,
          type: "ACTION",
          verify: "REFERRAL_SIGNUPS",
          verifyTarget: m.verifyTarget,
          rewardScore: m.rewardScore,
          rewardRounds: m.rewardRounds,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
