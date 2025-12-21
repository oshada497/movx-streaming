// ===== Initialize Dummy Content into Supabase =====
// This script checks if Supabase has content, and if not, populates it with dummy data

(async function initDummyContent() {
    // Wait for DB to be available
    if (typeof DB === 'undefined') {
        console.error('DB module not loaded yet.');
        return;
    }

    try {
        console.log('Checking for existing content in Supabase...');
        const [movies, shows] = await Promise.all([DB.getMovies(), DB.getTVShows()]);

        if (movies.length > 0 || shows.length > 0) {
            console.log('Content already exists in Supabase. Skipping dummy data initialization.');
            if (window.app && window.app.loadContent) {
                window.app.loadContent();
            }
            return;
        }

        console.log('Supabase is empty. Initializing dummy content...');

        // Dummy Movies with real TMDB images
        const dummyMovies = [
            {
                tmdbId: 912649,
                title: "Venom: The Last Dance",
                description: "Eddie and Venom are on the run. Hunted by both of their worlds and with the net closing in, the duo are forced into a devastating decision that will bring the curtains down on Venom and Eddie's last dance.",
                platform: "NETFLIX",
                year: "2024",
                rating: 6.8,
                genres: ["Action", "Science Fiction", "Adventure"],
                backdrop: "https://image.tmdb.org/t/p/original/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg",
                poster: "https://image.tmdb.org/t/p/w500/aosm8NMQ3UyoBVpSxyimorCQykC.jpg",
                ageRating: "PG-13",
                runtime: "109 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 1184918,
                title: "The Wild Robot",
                description: "After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island. To survive the harsh environment, Roz bonds with the island's animals and cares for an orphaned baby goose.",
                platform: "DISNEY+",
                year: "2024",
                rating: 8.5,
                genres: ["Animation", "Science Fiction", "Family"],
                backdrop: "https://image.tmdb.org/t/p/original/9oYdz5gDoIl8h67e3ccv3OHtmm2.jpg",
                poster: "https://image.tmdb.org/t/p/w500/wNHhE2jeO3uQnJDsXPitwD7GfpD.jpg",
                ageRating: "PG",
                runtime: "102 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 533535,
                title: "Deadpool & Wolverine",
                description: "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again.",
                platform: "PRIME VIDEO",
                year: "2024",
                rating: 7.7,
                genres: ["Action", "Comedy", "Science Fiction"],
                backdrop: "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
                poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
                ageRating: "R",
                runtime: "128 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 762509,
                title: "Mufasa: The Lion King",
                description: "Mufasa, a cub lost and alone, meets a sympathetic lion named Taka, the heir to a royal bloodline. The chance meeting sets in motion an expansive journey of a group of misfits searching for their destiny.",
                platform: "DISNEY+",
                year: "2024",
                rating: 7.4,
                genres: ["Adventure", "Family", "Drama"],
                backdrop: "https://image.tmdb.org/t/p/original/dn3gbDpXPSwC6saMJOHkCiFA9e4.jpg",
                poster: "https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg",
                ageRating: "PG",
                runtime: "118 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 558449,
                title: "Gladiator II",
                description: "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum after his home is conquered by the tyrannical Emperors.",
                platform: "NETFLIX",
                year: "2024",
                rating: 6.8,
                genres: ["Action", "Adventure", "Drama"],
                backdrop: "https://image.tmdb.org/t/p/original/euYIwmwkmz95mnXvufEmbL6ovhZ.jpg",
                poster: "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
                ageRating: "R",
                runtime: "148 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 698687,
                title: "Transformers One",
                description: "The untold origin story of Optimus Prime and Megatron, better known as sworn enemies, but once were friends bonded like brothers who changed the fate of Cybertron forever.",
                platform: "PRIME VIDEO",
                year: "2024",
                rating: 8.0,
                genres: ["Animation", "Action", "Science Fiction"],
                backdrop: "https://image.tmdb.org/t/p/original/nvVuXBZYuoAPz30H8R0yLdQ1EUC.jpg",
                poster: "https://image.tmdb.org/t/p/w500/qbkAqmmEIZfrCO8ZQAuIuVMlWoV.jpg",
                ageRating: "PG",
                runtime: "104 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 402431,
                title: "Wicked",
                description: "In the land of Oz, ostracized and misunderstood green-skinned Elphaba is forced to share a room with the popular Galinda. The two become inseparable friends until they meet the Wizard.",
                platform: "APPLE TV+",
                year: "2024",
                rating: 7.6,
                genres: ["Drama", "Fantasy", "Romance"],
                backdrop: "https://image.tmdb.org/t/p/original/uKb22E0nlzr914bA9KyA5CVCeJE.jpg",
                poster: "https://image.tmdb.org/t/p/w500/c5Tqxeo1UpBvnAc3csUm7j3hlQl.jpg",
                ageRating: "PG",
                runtime: "160 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 1064028,
                title: "Moana 2",
                description: "After receiving an unexpected call from her wayfinding ancestors, Moana journeys alongside Maui and a new crew to the far seas of Oceania and into dangerous, long-lost waters.",
                platform: "DISNEY+",
                year: "2024",
                rating: 7.0,
                genres: ["Animation", "Adventure", "Family"],
                backdrop: "https://image.tmdb.org/t/p/original/pvTzw8NA6V9jkl3kCIUf5jaRJVB.jpg",
                poster: "https://image.tmdb.org/t/p/w500/yh64qw9mgXBvlaWDi7Q9tpUBAvH.jpg",
                ageRating: "PG",
                runtime: "100 min",
                videoUrl: "",
                created_at: new Date().toISOString()
            }
        ];

        // Dummy TV Shows with real TMDB images
        const dummyTVShows = [
            {
                tmdbId: 1396,
                title: "Breaking Bad",
                description: "When Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family's financial future.",
                platform: "NETFLIX",
                year: "2008",
                rating: 8.9,
                genres: ["Drama", "Crime"],
                backdrop: "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
                poster: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
                ageRating: "18+",
                seasons: 5,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 94997,
                title: "House of the Dragon",
                description: "The Targaryen dynasty is at the absolute apex of its power, with more than 15 dragons under their yoke. Most combatants combust during the Dance of the Dragons.",
                platform: "HBO MAX",
                year: "2022",
                rating: 8.4,
                genres: ["Action", "Drama", "Fantasy"],
                backdrop: "https://image.tmdb.org/t/p/original/9GBPg0I7a4q0SFwVLLdYNFxsU4N.jpg",
                poster: "https://image.tmdb.org/t/p/w500/7QMsOTM3hZfnsnPnJCu4ZRHZqYW.jpg",
                ageRating: "18+",
                seasons: 2,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 1399,
                title: "Game of Thrones",
                description: "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north.",
                platform: "HBO MAX",
                year: "2011",
                rating: 8.4,
                genres: ["Action", "Drama", "Fantasy"],
                backdrop: "https://image.tmdb.org/t/p/original/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
                poster: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
                ageRating: "18+",
                seasons: 8,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 84958,
                title: "Loki",
                description: "After stealing the Tesseract in 2012, an alternate version of Loki is brought to the TVA, a bureaucratic organization that exists outside of time and space, forced to answer for his crimes against the timeline.",
                platform: "DISNEY+",
                year: "2021",
                rating: 8.2,
                genres: ["Drama", "Fantasy", "Science Fiction"],
                backdrop: "https://image.tmdb.org/t/p/original/kXFU5nntAOlZS0gHfXcAeVNjL0w.jpg",
                poster: "https://image.tmdb.org/t/p/w500/voHUmluYmKyleFkTu3lOXQG702u.jpg",
                ageRating: "PG-13",
                seasons: 2,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 1402,
                title: "The Walking Dead",
                description: "Sheriff's deputy Rick Grimes awakens from a coma to find a post-apocalyptic world dominated by flesh-eating zombies. He sets out to find his family and encounters many other survivors along the way.",
                platform: "NETFLIX",
                year: "2010",
                rating: 8.1,
                genres: ["Action", "Drama", "Horror"],
                backdrop: "https://image.tmdb.org/t/p/original/wvdWb5kTQipdMDqCclC6Y3zr4j3.jpg",
                poster: "https://image.tmdb.org/t/p/w500/xf9wuDcqlUPWABZNeDKPbZUjWx0.jpg",
                ageRating: "18+",
                seasons: 11,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 66732,
                title: "Stranger Things",
                description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
                platform: "NETFLIX",
                year: "2016",
                rating: 8.6,
                genres: ["Drama", "Mystery", "Science Fiction"],
                backdrop: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
                poster: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
                ageRating: "PG-13",
                seasons: 4,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 76479,
                title: "The Boys",
                description: "A group of vigilantes known as 'The Boys' set out to take down corrupt superheroes with no more than their blue-collar grit and a willingness to fight dirty.",
                platform: "PRIME VIDEO",
                year: "2019",
                rating: 8.5,
                genres: ["Action", "Comedy", "Crime"],
                backdrop: "https://image.tmdb.org/t/p/original/7cqKGQMnNtGwfXHtZ3dheHX7rHn.jpg",
                poster: "https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg",
                ageRating: "18+",
                seasons: 4,
                videoUrl: "",
                created_at: new Date().toISOString()
            },
            {
                tmdbId: 60574,
                title: "Peaky Blinders",
                description: "A gangster family epic set in 1900s England, centering on a gang who sew razor blades in the peaks of their caps, and their fierce boss Tommy Shelby.",
                platform: "NETFLIX",
                year: "2013",
                rating: 8.6,
                genres: ["Crime", "Drama"],
                backdrop: "https://image.tmdb.org/t/p/original/rBF8wVQN8qRHMJLMl2fz78MoLmn.jpg",
                poster: "https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg",
                ageRating: "18+",
                seasons: 6,
                videoUrl: "",
                created_at: new Date().toISOString()
            }
        ];

        // Insert Content
        let movieCount = 0;
        for (const movie of dummyMovies) {
            if (await DB.addMovie(movie)) movieCount++;
        }

        let showCount = 0;
        for (const show of dummyTVShows) {
            if (await DB.addTVShow(show)) showCount++;
        }

        console.log(`Initialized ${movieCount} movies and ${showCount} TV shows into Supabase`);

        // Reload content in app
        if (window.app && window.app.loadContent) {
            window.app.loadContent();
        }

    } catch (error) {
        console.error('Error initializing data:', error);
    }
})();
