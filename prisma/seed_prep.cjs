const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resources = [
    // FRONTEND
    {
      title: "React.js Advanced Interview Questions",
      description: "Deep dive into React hooks, reconciliation, and performance optimization.",
      type: "article", domain: "Frontend", company: "General", experience: "Intermediate", difficulty: "Hard",
      tasks: [
        { id: "1", title: "React Reconciliation Explained", url: "https://www.youtube.com/watch?v=7Yhdqirvp9g", type: "video" },
        { id: "2", title: "React Hooks Interview Questions", url: "https://leetcode.com/discuss/interview-question/frontend", type: "link" },
        { id: "3", title: "Implement UseMemo from scratch", url: "https://leetcode.com/problems/memoize/", type: "code" }
      ]
    },
    {
      title: "Google Frontend Interview: System Design",
      description: "How to design a scalable dashboard component for massive user bases.",
      type: "video", domain: "Frontend", company: "Google", experience: "Senior", difficulty: "Hard", isPremium: true,
      tasks: [
        { id: "1", title: "Web Performance Fundamentals", url: "https://web.dev/vitals/", type: "link" },
        { id: "2", title: "System Design for Dashboards", url: "https://www.youtube.com/watch?v=i7SjAnp0hY0", type: "video" },
        { id: "3", title: "Architecture Design Exercise", url: "https://github.com/donnemartin/system-design-primer", type: "link" }
      ]
    },
    {
      title: "Next.js 14 App Router Mastery",
      description: "Server Components, Server Actions, and advanced routing patterns.",
      type: "article", domain: "Frontend", company: "General", experience: "Intermediate", difficulty: "Medium",
      tasks: [
        { id: "1", title: "Next.js App Router Course", url: "https://www.youtube.com/watch?v=wm5gMKuwSYk", type: "video" },
        { id: "2", title: "Caching in Next.js", url: "https://nextjs.org/docs/app/building-your-application/caching", type: "link" },
        { id: "3", title: "Data Fetching Strategies", url: "https://nextjs.org/docs/app/building-your-application/data-fetching", type: "link" }
      ]
    },

    // BACKEND
    {
      title: "Node.js Event Loop Explained",
      description: "Understand the internals of Node.js for high-performance backends.",
      type: "article", domain: "Backend", company: "General", experience: "Intermediate", difficulty: "Medium",
      tasks: [
        { id: "1", title: "Node.js Architecture Overview", url: "https://www.youtube.com/watch?v=L0T_67t3SAs", type: "video" },
        { id: "2", title: "Event Loop Visualization", url: "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick", type: "link" },
        { id: "3", title: "Thread Pool Challenges", url: "https://github.com/nodejs/node", type: "link" }
      ]
    },
    {
      title: "SQL Performance Tuning for Seniors",
      description: "Indexes, query plans, and optimization techniques for PostgreSQL.",
      type: "article", domain: "Backend", company: "General", experience: "Senior", difficulty: "Hard",
      tasks: [
        { id: "1", title: "PostgreSQL Indexing Deep Dive", url: "https://www.youtube.com/watch?v=Hbase8i2S6U", type: "video" },
        { id: "2", title: "Explain Analyze Explained", url: "https://www.postgresqltutorial.com/postgresql-administration/postgresql-explain/", type: "link" },
        { id: "3", title: "Database Sharding Strategies", url: "https://medium.com/@jeeyoungk/how-sharding-works-b4dec5493d6d", type: "link" }
      ]
    },
    {
      title: "Microservices with NestJS and Kafka",
      description: "Building event-driven architectures at scale.",
      type: "video", domain: "Backend", company: "Meta", experience: "Senior", difficulty: "Hard", isPremium: true,
      tasks: [
        { id: "1", title: "NestJS Microservices Intro", url: "https://docs.nestjs.com/microservices/basics", type: "link" },
        { id: "2", title: "Kafka Event Streaming Guide", url: "https://www.youtube.com/watch?v=R67unY7ST94", type: "video" },
        { id: "3", title: "Implementing Saga Pattern", url: "https://microservices.io/patterns/data/saga.html", type: "link" }
      ]
    },

    // DATA SCIENCE
    {
      title: "Python for Data Science Cheat Sheet",
      description: "Pandas, Numpy, and Scikit-learn essentials in one page.",
      type: "pdf", domain: "Data Science", company: "General", experience: "Fresher", difficulty: "Easy",
      tasks: [
        { id: "1", title: "Numpy & Pandas Crash Course", url: "https://www.youtube.com/watch?v=GPVsHOlRBBI", type: "video" },
        { id: "2", title: "Kaggle: Titanic Survival Quiz", url: "https://www.kaggle.com/c/titanic", type: "link" },
        { id: "3", title: "GeeksforGeeks: Pandas Tutorial", url: "https://www.geeksforgeeks.org/pandas-tutorial/", type: "link" }
      ]
    },
    {
      title: "Machine Learning: Google's Top Questions",
      description: "From Gradient Descent to Transformers - what Google asks.",
      type: "article", domain: "Data Science", company: "Google", experience: "Intermediate", difficulty: "Hard", isPremium: true,
      tasks: [
        { id: "1", title: "ML Interview Preparation", url: "https://www.youtube.com/watch?v=nI7U1v0yZ-w", type: "video" },
        { id: "2", title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course", type: "link" },
        { id: "3", title: "Solving Linear Regression", url: "https://leetcode.com/problems/generate-binary-strings-without-adjacent-zeros/", type: "code" }
      ]
    },

    // DEVOPS
    {
      title: "Kubernetes for Absolute Beginners",
      description: "Pods, Services, and Deployments explained simply.",
      type: "video", domain: "DevOps", company: "General", experience: "Fresher", difficulty: "Medium",
      tasks: [
        { id: "1", title: "Kubernetes in 10 Minutes", url: "https://www.youtube.com/watch?v=Pzg4bEecZ60", type: "video" },
        { id: "2", title: "K8s Official Interactive Tutorial", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/", type: "link" },
        { id: "3", title: "Minikube Setup Guide", url: "https://minikube.sigs.k8s.io/docs/start/", type: "link" }
      ]
    },
    {
      title: "AWS Certified Solutions Architect Path",
      description: "Complete roadmap to passing the SAA-C03 exam.",
      type: "article", domain: "DevOps", company: "Amazon", experience: "Intermediate", difficulty: "Hard", isPremium: true,
      tasks: [
        { id: "1", title: "AWS S3 and EC2 Mastery", url: "https://www.youtube.com/watch?v=RrKRN9zrbKo", type: "video" },
        { id: "2", title: "AWS Well-Architected Framework", url: "https://aws.amazon.com/architecture/well-architected/", type: "link" },
        { id: "3", title: "Practice Exam Questions", url: "https://www.examtopics.com/exams/amazon/aws-certified-solutions-architect-associate-saa-c03/", type: "link" }
      ]
    }
  ];

  console.log("Cleaning up old data...");
  await prisma.prepResource.deleteMany();

  console.log("Seeding comprehensive prep resources...");
  for (const r of resources) {
    await prisma.prepResource.create({ data: r });
  }
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
