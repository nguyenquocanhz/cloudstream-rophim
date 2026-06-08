/**
 * RoPhimTV Provider cho Cloudstream 3
 * Được xây dựng để đọc trực tiếp nguồn dữ liệu tĩnh đã kết xuất từ MongoDB
 */
const plugin = {
    name: "RoPhimTV",
    version: "1.0.0",
    description: "Kho phim thuyết minh, lồng tiếng chất lượng cao từ RoPhimTV",
    author: "Fullstack Developer",
    icon: "https://YOUR_GITHUB_USERNAME.github.io/rophimtv-extensions/logo.png",

    // URL nguồn cấp dữ liệu chính của bạn trên GitHub Pages
    FEED_URL: "https://YOUR_GITHUB_USERNAME.github.io/rophimtv-extensions/cloudstream_feed.json",

    // Gọi khi bắt đầu tải plugin
    async onLoad() {
        console.log("RoPhimTV Extension initialized successfully!");
    },

    // Hiển thị danh mục phim nổi bật tại trang chủ của ứng dụng Cloudstream
    async getHomePage() {
        try {
            const response = await fetch(this.FEED_URL);
            const data = JSON.parse(response);
            const movies = data.results || [];

            // Lấy danh sách 40 phim mới nhất để render lên hàng đầu trang chủ
            const latestMovies = movies.slice(0, 40).map(m => ({
                name: m.title,
                url: m.id,
                posterUrl: m.poster,
                type: m.type === "movie" ? "movie" : "tv"
            }));

            // Phân loại Phim Lẻ
            const singleMovies = movies.filter(m => m.type === "movie").slice(0, 24).map(m => ({
                name: m.title,
                url: m.id,
                posterUrl: m.poster,
                type: "movie"
            }));

            // Phân loại Phim Bộ
            const tvSeries = movies.filter(m => m.type === "tv").slice(0, 24).map(m => ({
                name: m.title,
                url: m.id,
                posterUrl: m.poster,
                type: "tv"
            }));

            return [
                {
                    name: "Phim Mới Cập Nhật",
                    list: latestMovies
                },
                {
                    name: "Phim Lẻ Thịnh Hành",
                    list: singleMovies
                },
                {
                    name: "Phim Bộ Đề Xuất",
                    list: tvSeries
                }
            ];
        } catch (err) {
            console.error("Lỗi khi tải dữ liệu trang chủ: ", err);
            return [];
        }
    },

    // Xử lý tìm kiếm khi người dùng nhập từ khóa trên thanh Search của Cloudstream
    async search(query) {
        try {
            const response = await fetch(this.FEED_URL);
            const data = JSON.parse(response);
            const movies = data.results || [];

            const cleanQuery = query.toLowerCase().trim();

            // Tìm kiếm tương đối theo tiêu đề tiếng Việt hoặc tiếng Anh gốc
            const results = movies.filter(m => 
                m.title.toLowerCase().includes(cleanQuery) || 
                (m.original_title && m.original_title.toLowerCase().includes(cleanQuery))
            );

            return results.map(m => ({
                name: m.title,
                url: m.id,
                posterUrl: m.poster,
                type: m.type === "movie" ? "movie" : "tv"
            }));
        } catch (err) {
            console.error("Lỗi tìm kiếm phim: ", err);
            return [];
        }
    },

    // Trả về thông tin chi tiết và danh sách tập của bộ phim khi người dùng click vào
    async getDetail(id) {
        try {
            const response = await fetch(this.FEED_URL);
            const data = JSON.parse(response);
            const movies = data.results || [];

            // Tìm phim theo mã ID định danh duy nhất
            const movie = movies.find(m => m.id === id);
            if (!movie) return null;

            return {
                name: movie.title,
                url: movie.id,
                posterUrl: movie.poster,
                backgroundUrl: movie.banner,
                description: movie.description,
                year: movie.year,
                rating: movie.rating * 10, // Quy chuẩn thang điểm 100 của Cloudstream
                type: movie.type === "movie" ? "movie" : "tv",
                actors: (movie.casts || []).map(c => ({
                    name: c.name,
                    role: c.role,
                    imageUrl: c.image
                })),
                // Ánh xạ toàn bộ tập phim từ feed
                episodes: (movie.episodes || []).map(ep => ({
                    name: ep.name,
                    episode: ep.episode,
                    season: ep.season,
                    // Lưu trữ danh sách nguồn phát (m3u8/embed) dưới dạng JSON String vào trường URL của tập phim
                    url: JSON.stringify(ep.sources)
                }))
            };
        } catch (err) {
            console.error("Lỗi tải thông tin chi tiết phim: ", err);
            return null;
        }
    },

    // Khai thác luồng phát thô (m3u8) hoặc nhúng (embed) của tập phim được chọn để đưa vào Player
    async getSources(episodeUrl) {
        try {
            const sources = JSON.parse(episodeUrl);
            const finalStreams = [];

            for (const src of sources) {
                if (src.type === "m3u8") {
                    finalStreams.push({
                        url: src.file,
                        name: src.label,
                        isM3u8: true
                    });
                } else if (src.type === "embed") {
                    finalStreams.push({
                        url: src.file,
                        name: src.label,
                        isEmbed: true
                    });
                }
            }

            return finalStreams;
        } catch (err) {
            console.error("Lỗi phân tích nguồn phát video: ", err);
            return [];
        }
    }
};

// Đăng ký Plugin vào lõi Engine của ứng dụng Cloudstream
registerPlugin(plugin);