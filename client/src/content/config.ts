import { defineCollection, z } from "astro:content"

const pageCollection = defineCollection({
    type: "data",
    schema: z
        .object({
            id: z.string(),
            date: z.object({
                fullDate: z.string(),
                date: z.string(),
                time: z.string(),
            }),
            content: z
                .object({
                    username: z.string().optional(),
                    message: z.string(),
                })
                .array(),
        })
        .array(),
})

export const collections = {
    page: pageCollection,
}
