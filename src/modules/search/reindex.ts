import { prisma } from "../../db/prisma.js";
import { meili } from "../../db/search.js";
import { SearchService } from "./search.service.js";

const count = await new SearchService(meili, prisma).reindexAll();
console.log(`Indexed ${count} media records`);
await prisma.$disconnect();
