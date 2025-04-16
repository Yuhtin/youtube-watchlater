--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ColumnType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ColumnType" AS ENUM (
    'WATCH_LATER',
    'WATCHING',
    'WATCHED'
);


ALTER TYPE public."ColumnType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Suggestion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Suggestion" (
    id text NOT NULL,
    "fromUserId" text NOT NULL,
    "toUserId" text NOT NULL,
    "videoId" text NOT NULL,
    "videoTitle" text NOT NULL,
    "videoThumbnail" text NOT NULL,
    "videoDuration" integer,
    note text,
    read boolean DEFAULT false NOT NULL,
    accepted boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Suggestion" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "imageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: cards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cards (
    id text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    "thumbnailUrl" text NOT NULL,
    status public."ColumnType" DEFAULT 'WATCH_LATER'::public."ColumnType" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "userId" text NOT NULL,
    "playlistId" text,
    "durationSeconds" integer,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cards OWNER TO postgres;

--
-- Name: playlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.playlists (
    id text NOT NULL,
    title text NOT NULL,
    "userId" text NOT NULL,
    "thumbnailUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "durationSeconds" integer
);


ALTER TABLE public.playlists OWNER TO postgres;

--
-- Data for Name: Suggestion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Suggestion" (id, "fromUserId", "toUserId", "videoId", "videoTitle", "videoThumbnail", "videoDuration", note, read, accepted, "createdAt", "updatedAt") FROM stdin;
e5a15501-9a70-404d-8c3c-ceaaff6fdaad	873c9f07-9a93-4ad9-9e79-a6a44002da6e	6fdf3647-36ff-4c8f-a5e0-86357759477c	MwHHErfX9hI	Making Lego Car CLIMB Obstacles	https://img.youtube.com/vi/MwHHErfX9hI/0.jpg	352	nao sei se vc assistiu ou nao	t	t	2025-04-16 02:48:29.501	2025-04-16 05:50:30.386
125fc2b1-cf2a-48ab-ac11-88a926254e80	6fdf3647-36ff-4c8f-a5e0-86357759477c	873c9f07-9a93-4ad9-9e79-a6a44002da6e	U_q7rrM9xAY	How Duolingo Saved Millions in AWS Cloud Costs	https://img.youtube.com/vi/U_q7rrM9xAY/0.jpg	512	aceita ae	t	t	2025-04-15 20:52:10	2025-04-16 13:00:19.768
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, username, password, "imageUrl", "createdAt", "updatedAt") FROM stdin;
873c9f07-9a93-4ad9-9e79-a6a44002da6e	Yuhtin	$2b$10$VnXrEwLt8wxf1N6CUB2I4O3gLHIKv0hRO89m7M/t6s1b7.qj4RXou	https://avatars.githubusercontent.com/u/26367735?v=4	2025-04-14 04:28:59.92	2025-04-14 04:28:59.92
8a7b678b-8a87-4a9c-be24-36d9a44fd698	Pepdro	$2b$10$PVSCXyRS9EVJPRJt6mVrzuV25jY8EjQMU1J/B0vYwxouPUJkk6JL.	\N	2025-04-14 14:00:04.863	2025-04-14 14:00:04.863
6fdf3647-36ff-4c8f-a5e0-86357759477c	marry	$2b$10$mxrPNL8qffWX7XwU0p1Pz.zH.ZYEo4sy3K6CeFzQL3Ji1juVPcplO	https://avatars.githubusercontent.com/u/194010241?v=4	2025-04-15 20:18:01	2025-04-15 20:18:01
\.


--
-- Data for Name: cards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cards (id, title, url, "thumbnailUrl", status, "order", "userId", "playlistId", "durationSeconds", "addedAt") FROM stdin;
4nX5YCkwaCA	How Hamilton Makes You Cry Part 3: Unimaginable	https://www.youtube.com/watch?v=4nX5YCkwaCA	https://i.ytimg.com/vi/4nX5YCkwaCA/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	1559	2025-04-16 00:14:11.922
BK42FerFetg	How Hamilton Works: The Aaron Burr Chord Progression	https://www.youtube.com/watch?v=BK42FerFetg	https://i.ytimg.com/vi/BK42FerFetg/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	521	2025-04-16 00:14:12.303
on24JsOBZAA	How Hamilton Works: My Shot Explained in 11 Songs	https://www.youtube.com/watch?v=on24JsOBZAA	https://i.ytimg.com/vi/on24JsOBZAA/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	827	2025-04-16 00:14:12.52
jiULm_cDjus	How Hamilton Works: Eliza's Chord Progression	https://www.youtube.com/watch?v=jiULm_cDjus	https://i.ytimg.com/vi/jiULm_cDjus/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	523	2025-04-16 00:14:12.683
2oeRDXgRyHU	How Hamilton Works: Why Stay Alive sounds like Bond	https://www.youtube.com/watch?v=2oeRDXgRyHU	https://i.ytimg.com/vi/2oeRDXgRyHU/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	1157	2025-04-16 00:14:12.848
ro8uhPr2PSM	Why Yorktown & Hurricane Are Connected (How Hamilton Works)	https://www.youtube.com/watch?v=ro8uhPr2PSM	https://i.ytimg.com/vi/ro8uhPr2PSM/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	695	2025-04-16 00:14:13.046
Sq-M0GhIeDk	How Rap Works in Hamilton (Part 1)	https://www.youtube.com/watch?v=Sq-M0GhIeDk	https://i.ytimg.com/vi/Sq-M0GhIeDk/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	994	2025-04-16 00:14:13.246
ceTXD9jgncs	How Rap Works in Hamilton Part 2: Metaphor	https://www.youtube.com/watch?v=ceTXD9jgncs	https://i.ytimg.com/vi/ceTXD9jgncs/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	786	2025-04-16 00:14:13.486
84NcQT4Ekgw	Vernacular: How Rap Works in Hamilton part 3	https://www.youtube.com/watch?v=84NcQT4Ekgw	https://i.ytimg.com/vi/84NcQT4Ekgw/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	1135	2025-04-16 00:14:13.931
qDUEqcIsQh8	Backstage with Washington (Marcus Choi) in Hamilton's 2nd National Tour	https://www.youtube.com/watch?v=qDUEqcIsQh8	https://i.ytimg.com/vi/qDUEqcIsQh8/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	426	2025-04-16 00:14:14.334
OPh35hdsaPk	Answering Your Comments (25,000 subs!)	https://www.youtube.com/watch?v=OPh35hdsaPk	https://i.ytimg.com/vi/OPh35hdsaPk/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	499	2025-04-16 00:14:14.716
gyrC8PR8Npo	How the Hamilfilm Trailer Works	https://www.youtube.com/watch?v=gyrC8PR8Npo	https://i.ytimg.com/vi/gyrC8PR8Npo/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	686	2025-04-16 00:14:14.93
UtwGXljb-yo	Lin-Manuel Miranda called me out, so I responded!	https://www.youtube.com/watch?v=UtwGXljb-yo	https://i.ytimg.com/vi/UtwGXljb-yo/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	60	2025-04-16 00:14:15.128
1qXsFs2ywMo	10 Reasons 10 Duel Commandments Is Amazing (How Hamilton Works)	https://www.youtube.com/watch?v=1qXsFs2ywMo	https://i.ytimg.com/vi/1qXsFs2ywMo/hqdefault.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	874	2025-04-16 00:14:10.523
k5ALY8sEZ5o	Why the First Measure of Hamilton Is Amazing (BroadwayCon Panel 2025) #Hamilten	https://www.youtube.com/watch?v=k5ALY8sEZ5o	https://i.ytimg.com/vi/k5ALY8sEZ5o/hqdefault.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	1132	2025-04-16 00:14:10.729
4Fk8tkgAQPc	How Hamilton Makes You Cry (Part 1)	https://www.youtube.com/watch?v=4Fk8tkgAQPc	https://i.ytimg.com/vi/4Fk8tkgAQPc/hqdefault.jpg	WATCHING	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	167	2025-04-16 00:14:10.916
933tIGe0n24	How Hamilton Makes You Cry (Part 2) - The Story of Tonight	https://www.youtube.com/watch?v=933tIGe0n24	https://i.ytimg.com/vi/933tIGe0n24/hqdefault.jpg	WATCHING	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	1012	2025-04-16 00:14:11.189
Hl1dHFOl3Zo	Redstone Binary Addition - LRR #4	https://www.youtube.com/watch?v=Hl1dHFOl3Zo	https://i.ytimg.com/vi/Hl1dHFOl3Zo/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	1309	2025-04-16 00:16:32.744
_fZP-r2yhnY	Redstone Binary Subtraction - LRR #5	https://www.youtube.com/watch?v=_fZP-r2yhnY	https://i.ytimg.com/vi/_fZP-r2yhnY/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	846	2025-04-16 00:16:32.947
34QSMj1wbe4	Combinational Redstone Devices - LRR #6	https://www.youtube.com/watch?v=34QSMj1wbe4	https://i.ytimg.com/vi/34QSMj1wbe4/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	1000	2025-04-16 00:16:33.196
N-edYGFQIjY	Pulses, Clocks, Latches & Flip-flops - LRR #7	https://www.youtube.com/watch?v=N-edYGFQIjY	https://i.ytimg.com/vi/N-edYGFQIjY/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	825	2025-04-16 00:16:33.502
XCug8h5oEGE	Sequential Redstone Devices - LRR #8	https://www.youtube.com/watch?v=XCug8h5oEGE	https://i.ytimg.com/vi/XCug8h5oEGE/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	916	2025-04-16 00:16:34.141
mDLfUbAK9T0	Redstone Displays - LRR #9	https://www.youtube.com/watch?v=mDLfUbAK9T0	https://i.ytimg.com/vi/mDLfUbAK9T0/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	1548	2025-04-16 00:16:34.624
WI3RNlOErFI	How to Make Any Game with Redstone - LRR #10	https://www.youtube.com/watch?v=WI3RNlOErFI	https://i.ytimg.com/vi/WI3RNlOErFI/hqdefault.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	1309	2025-04-16 00:16:34.994
BH0j4qQORqE	The Basics of Redstone - LRR #1	https://www.youtube.com/watch?v=BH0j4qQORqE	https://i.ytimg.com/vi/BH0j4qQORqE/hqdefault.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	1077	2025-04-16 00:16:32.179
fV8nrZo-o4s	Redstone Number Systems - LRR #2	https://www.youtube.com/watch?v=fV8nrZo-o4s	https://i.ytimg.com/vi/fV8nrZo-o4s/hqdefault.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	567	2025-04-16 00:16:32.404
J36WJHaFPGc	Boolean Algebra & Redstone Logic Gates - LRR #3	https://www.youtube.com/watch?v=J36WJHaFPGc	https://i.ytimg.com/vi/J36WJHaFPGc/hqdefault.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	945	2025-04-16 00:16:32.565
CvdkPPovDVU	VIBE LEARNING	https://www.youtube.com/watch?v=CvdkPPovDVU	https://img.youtube.com/vi/CvdkPPovDVU/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	984	2025-04-16 00:30:43.525
MwHHErfX9hI	Making Lego Car CLIMB Obstacles	https://www.youtube.com/watch?v=MwHHErfX9hI	https://img.youtube.com/vi/MwHHErfX9hI/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	352	2025-04-16 00:31:17.605
_ZKNOKHpqE4	The Engineering Inside Wireless Earbuds || How do Wireless Earbuds and Audio Codecs Work?	https://www.youtube.com/watch?v=_ZKNOKHpqE4	https://img.youtube.com/vi/_ZKNOKHpqE4/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	1061	2025-04-16 00:32:35.125
NwZ26lxl8wU	How Notion Handles 200 BILLION Notes (Without Crashing)	https://www.youtube.com/watch?v=NwZ26lxl8wU	https://img.youtube.com/vi/NwZ26lxl8wU/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	603	2025-04-16 00:32:35.224
lXcubs0DLqg	A única forma de Evoluir, é ser Esmagado pela DISCIPLINA	https://www.youtube.com/watch?v=lXcubs0DLqg	https://img.youtube.com/vi/lXcubs0DLqg/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	249	2025-04-16 00:32:35.197
MknV3t5QbUc	Game theory challenge: Can you predict human behavior? - Lucas Husted	https://www.youtube.com/watch?v=MknV3t5QbUc	https://img.youtube.com/vi/MknV3t5QbUc/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	299	2025-04-16 00:32:35.224
Hu4Yvq-g7_Y	How to Get Your Brain to Focus | Chris Bailey | TEDxManchester	https://www.youtube.com/watch?v=Hu4Yvq-g7_Y	https://img.youtube.com/vi/Hu4Yvq-g7_Y/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	957	2025-04-16 00:32:35.211
IJHrPjx4egM	Computing just changed forever… but there’s a catch	https://www.youtube.com/watch?v=IJHrPjx4egM	https://img.youtube.com/vi/IJHrPjx4egM/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	300	2025-04-16 00:32:35.211
PQ2WjtaPfXU	Microsoft goes nuclear on TypeScript codebase…	https://www.youtube.com/watch?v=PQ2WjtaPfXU	https://img.youtube.com/vi/PQ2WjtaPfXU/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	249	2025-04-16 00:32:35.24
c0KYU2j0TM4	The power of introverts | Susan Cain | TED	https://www.youtube.com/watch?v=c0KYU2j0TM4	https://img.youtube.com/vi/c0KYU2j0TM4/0.jpg	WATCH_LATER	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	1145	2025-04-16 00:32:35.224
2c5ygTQYTuA	O jeito errado de programar com o ChatGPT	https://www.youtube.com/watch?v=2c5ygTQYTuA	https://img.youtube.com/vi/2c5ygTQYTuA/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	989	2025-04-16 00:32:35.108
OYrYgiktraE	How Slack Slowly Destroyed Itself Over 8 Hours	https://www.youtube.com/watch?v=OYrYgiktraE	https://img.youtube.com/vi/OYrYgiktraE/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	780	2025-04-16 00:32:35.183
_R6g0fOIL2s	Como nunca mais ficar sem o que dizer	https://www.youtube.com/watch?v=_R6g0fOIL2s	https://img.youtube.com/vi/_R6g0fOIL2s/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	237	2025-04-16 00:32:35.183
KM4Xe6Dlp0Y	Looks aren't everything. Believe me, I'm a model. | Cameron Russell | TED	https://www.youtube.com/watch?v=KM4Xe6Dlp0Y	https://img.youtube.com/vi/KM4Xe6Dlp0Y/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	578	2025-04-16 00:32:35.198
y1D4DiZhSIo	How I Won The GMTK Game Jam	https://www.youtube.com/watch?v=y1D4DiZhSIo	https://img.youtube.com/vi/y1D4DiZhSIo/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	1509	2025-04-16 00:32:35.183
U_q7rrM9xAY	How Duolingo Saved Millions in AWS Cloud Costs	https://www.youtube.com/watch?v=U_q7rrM9xAY	https://img.youtube.com/vi/U_q7rrM9xAY/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	512	2025-04-16 00:32:35.211
arj7oStGLkU	Inside the Mind of a Master Procrastinator | Tim Urban | TED	https://www.youtube.com/watch?v=arj7oStGLkU	https://img.youtube.com/vi/arj7oStGLkU/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	844	2025-04-16 00:32:35.211
qGAPokt6Buo	How Uber Handles TRILLIONS of Transactions	https://www.youtube.com/watch?v=qGAPokt6Buo	https://img.youtube.com/vi/qGAPokt6Buo/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	783	2025-04-16 00:32:35.198
oyQysCOstjg	Why -1 x -1 = 1 in 60 Seconds	https://www.youtube.com/watch?v=oyQysCOstjg	https://img.youtube.com/vi/oyQysCOstjg/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	69	2025-04-16 00:32:35.198
lfapxZUTiCU	11 Interesting Psychological Facts About Human Behavior	https://www.youtube.com/watch?v=lfapxZUTiCU	https://img.youtube.com/vi/lfapxZUTiCU/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	568	2025-04-16 00:32:35.211
ddc3GyPtp98	Aerodinâmica é mais IMPORTANTE que motores na F1	https://www.youtube.com/watch?v=ddc3GyPtp98	https://img.youtube.com/vi/ddc3GyPtp98/0.jpg	WATCHING	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	2408	2025-04-16 00:32:35.198
CWV5NT0HyOU	Desire Paths: What They Reveal About Human Psychology	https://www.youtube.com/watch?v=CWV5NT0HyOU	https://img.youtube.com/vi/CWV5NT0HyOU/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	174	2025-04-16 00:32:35.224
Iq_r7IcNmUk	25 crazy software bugs explained	https://www.youtube.com/watch?v=Iq_r7IcNmUk	https://img.youtube.com/vi/Iq_r7IcNmUk/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	1010	2025-04-16 00:32:35.224
UIVADiGfwWc	Our AI girlfriends just leveled up big time…	https://www.youtube.com/watch?v=UIVADiGfwWc	https://img.youtube.com/vi/UIVADiGfwWc/0.jpg	WATCHED	0	6fdf3647-36ff-4c8f-a5e0-86357759477c	\N	305	2025-04-16 00:32:35.225
lv0LlujoNVQ	Going Undercover into the Darkest Corners of LinkedIn	https://www.youtube.com/watch?v=lv0LlujoNVQ	https://img.youtube.com/vi/lv0LlujoNVQ/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1134	2025-04-16 02:00:46.575
fXW-QjBsruE	Do Chairs Exist?	https://www.youtube.com/watch?v=fXW-QjBsruE	https://img.youtube.com/vi/fXW-QjBsruE/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	2274	2025-04-16 02:00:46.587
xuCn8ux2gbs	history of the entire world, i guess	https://www.youtube.com/watch?v=xuCn8ux2gbs	https://img.youtube.com/vi/xuCn8ux2gbs/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1166	2025-04-16 02:00:46.739
QgtqQe39oHI	The (Terrible) Economics of Hypixel Skyblock	https://www.youtube.com/watch?v=QgtqQe39oHI	https://img.youtube.com/vi/QgtqQe39oHI/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1345	2025-04-16 02:00:46.851
jMgxn10hxuE	Minecraft 1.17 -  All Goat Sounds (Updated Version)	https://www.youtube.com/watch?v=jMgxn10hxuE	https://img.youtube.com/vi/jMgxn10hxuE/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	73	2025-04-16 02:00:46.74
hsWr_JWTZss	The Trouble With Tumbleweed	https://www.youtube.com/watch?v=hsWr_JWTZss	https://img.youtube.com/vi/hsWr_JWTZss/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	402	2025-04-16 02:00:46.73
huhzfTU3RB4	RETROSPECTIVA TERCEIRÃO 2K24	https://www.youtube.com/watch?v=huhzfTU3RB4	https://img.youtube.com/vi/huhzfTU3RB4/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	790	2025-04-16 02:00:46.73
rStL7niR7gs	The Rules for Rulers	https://www.youtube.com/watch?v=rStL7niR7gs	https://img.youtube.com/vi/rStL7niR7gs/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1173	2025-04-16 02:00:46.588
p5NgoGDPxvc	Entendendo a singularidade de RHYTHM DOCTOR	https://www.youtube.com/watch?v=p5NgoGDPxvc	https://img.youtube.com/vi/p5NgoGDPxvc/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	2118	2025-04-16 02:00:46.587
KAjkicwrD4I	i memorized 3,141 digits of pi to prove a point	https://www.youtube.com/watch?v=KAjkicwrD4I	https://img.youtube.com/vi/KAjkicwrD4I/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1466	2025-04-16 02:00:46.587
PtrRZMUV_Hk	Portal + Snake Is Now A Full Game	https://www.youtube.com/watch?v=PtrRZMUV_Hk	https://img.youtube.com/vi/PtrRZMUV_Hk/0.jpg	WATCHING	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1630	2025-04-16 02:00:46.73
VHfAlMYo5-I	I Tried Formula 1	https://www.youtube.com/watch?v=VHfAlMYo5-I	https://img.youtube.com/vi/VHfAlMYo5-I/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1638	2025-04-16 02:00:46.867
nToLoH_JxNE	Hexomino Facts	https://www.youtube.com/watch?v=nToLoH_JxNE	https://img.youtube.com/vi/nToLoH_JxNE/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1110	2025-04-16 02:00:46.993
fL4TONkgEvY	The DUMBEST Rule for Maps.	https://www.youtube.com/watch?v=fL4TONkgEvY	https://img.youtube.com/vi/fL4TONkgEvY/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	482	2025-04-16 02:00:46.739
_E9AOweTwG0	Swan Lake except it's hunting season.	https://www.youtube.com/watch?v=_E9AOweTwG0	https://img.youtube.com/vi/_E9AOweTwG0/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	192	2025-04-16 02:00:46.731
NEDFUjqA1s8	Poisoning AI with ".аss" subtitles	https://www.youtube.com/watch?v=NEDFUjqA1s8	https://img.youtube.com/vi/NEDFUjqA1s8/0.jpg	WATCHING	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1136	2025-04-16 02:00:46.866
bgR3yESAEVE	Can Chess, with Hexagons?	https://www.youtube.com/watch?v=bgR3yESAEVE	https://img.youtube.com/vi/bgR3yESAEVE/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	659	2025-04-16 02:00:46.993
BKwKRIUKv64	What is the Dot Product and How is it Used? Applied Linear Algebra (part 2)	https://www.youtube.com/watch?v=BKwKRIUKv64	https://img.youtube.com/vi/BKwKRIUKv64/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	695	2025-04-16 02:00:46.731
1hiegWGUDjU	I Tried Air Traffic Control	https://www.youtube.com/watch?v=1hiegWGUDjU	https://img.youtube.com/vi/1hiegWGUDjU/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1113	2025-04-16 02:00:46.867
thOifuHs6eY	Hexagons are the Bestagons	https://www.youtube.com/watch?v=thOifuHs6eY	https://img.youtube.com/vi/thOifuHs6eY/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	567	2025-04-16 02:00:46.992
UJ_FvFknUS8	Can't Hold Us x Many - Mashup by Guy	https://www.youtube.com/watch?v=UJ_FvFknUS8	https://img.youtube.com/vi/UJ_FvFknUS8/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	264	2025-04-16 02:00:46.851
wbftu093Yqk	Donald no País da Matemágica (Completo - Dublado - 720p HD)	https://www.youtube.com/watch?v=wbftu093Yqk	https://img.youtube.com/vi/wbftu093Yqk/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1662	2025-04-16 02:00:46.738
S2L0sWMEG-A	Planets Don't Exist	https://www.youtube.com/watch?v=S2L0sWMEG-A	https://img.youtube.com/vi/S2L0sWMEG-A/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	840	2025-04-16 02:00:46.865
CGIEjak1xfs	You Need To Stop Taking Things Personally	https://www.youtube.com/watch?v=CGIEjak1xfs	https://img.youtube.com/vi/CGIEjak1xfs/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	944	2025-04-16 02:00:46.874
l4w6808wJcU	🇺🇸 DOES YOUR FLAG FAIL?  Grey Grades State Flags!	https://www.youtube.com/watch?v=l4w6808wJcU	https://img.youtube.com/vi/l4w6808wJcU/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1133	2025-04-16 02:00:46.991
b8aA9atkihA	How Easy Is It to Trick People with Facebook AI Slop?	https://www.youtube.com/watch?v=b8aA9atkihA	https://img.youtube.com/vi/b8aA9atkihA/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	638	2025-04-16 02:00:46.852
HuW9qJbL0xM	Mean Shift Clustering	https://www.youtube.com/watch?v=HuW9qJbL0xM	https://img.youtube.com/vi/HuW9qJbL0xM/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	853	2025-04-16 02:00:46.865
mbLGn3qBTjw	The Game Theory of Snitching	https://www.youtube.com/watch?v=mbLGn3qBTjw	https://img.youtube.com/vi/mbLGn3qBTjw/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	771	2025-04-16 02:00:46.993
s7Ogj7fqKy4	Uma BREVE análise da MELHOR série de hospital (House M.D)	https://www.youtube.com/watch?v=s7Ogj7fqKy4	https://img.youtube.com/vi/s7Ogj7fqKy4/0.jpg	WATCHING	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	3912	2025-04-16 02:00:46.577
T2mwbXInQCI	the deadliest sword in skyblock	https://www.youtube.com/watch?v=T2mwbXInQCI	https://i.ytimg.com/vi/T2mwbXInQCI/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	726	2025-04-16 02:36:19.786
0PAEqgfAts4	Skyblock: Potato War 2	https://www.youtube.com/watch?v=0PAEqgfAts4	https://i.ytimg.com/vi/0PAEqgfAts4/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	852	2025-04-16 02:36:20.121
5qjnDd1rsII	Skyblock: The Great Potato War	https://www.youtube.com/watch?v=5qjnDd1rsII	https://i.ytimg.com/vi/5qjnDd1rsII/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	1105	2025-04-16 02:36:19.972
tjLgq5P97uI	slaying dragons in skyblock	https://www.youtube.com/watch?v=tjLgq5P97uI	https://i.ytimg.com/vi/tjLgq5P97uI/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	683	2025-04-16 02:36:19.646
vLLJAiII6p4	flying in skyblock	https://www.youtube.com/watch?v=vLLJAiII6p4	https://i.ytimg.com/vi/vLLJAiII6p4/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	604	2025-04-16 02:36:19.479
MmZ3zs76bZQ	the fastest man in skyblock	https://www.youtube.com/watch?v=MmZ3zs76bZQ	https://i.ytimg.com/vi/MmZ3zs76bZQ/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	612	2025-04-16 02:36:19.262
c9gv5DU_cb0	the first boss of hypixel skyblock	https://www.youtube.com/watch?v=c9gv5DU_cb0	https://i.ytimg.com/vi/c9gv5DU_cb0/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	608	2025-04-16 02:36:18.987
pPmo21gkETU	the hypixel skyblock experience	https://www.youtube.com/watch?v=pPmo21gkETU	https://i.ytimg.com/vi/pPmo21gkETU/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	616	2025-04-16 02:36:18.496
09CeBwGbCeg	Skyblock: Potato War 3 (FINALE)	https://www.youtube.com/watch?v=09CeBwGbCeg	https://i.ytimg.com/vi/09CeBwGbCeg/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	1210	2025-04-16 02:36:20.292
i3NXPk4ROao	I Became the Mayor of Skyblock	https://www.youtube.com/watch?v=i3NXPk4ROao	https://i.ytimg.com/vi/i3NXPk4ROao/hqdefault.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	747	2025-04-16 02:36:20.488
sg2j7mZ9-2Y	w	https://www.youtube.com/watch?v=sg2j7mZ9-2Y	https://img.youtube.com/vi/sg2j7mZ9-2Y/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1108	2025-04-16 02:00:46.994
5aIPRw0RcvY	why movies sound better than real life	https://www.youtube.com/watch?v=5aIPRw0RcvY	https://img.youtube.com/vi/5aIPRw0RcvY/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1092	2025-04-16 02:00:46.991
CCbDdk8Wz-8	EVERYTHING IS TUBERCULOSIS	https://www.youtube.com/watch?v=CCbDdk8Wz-8	https://img.youtube.com/vi/CCbDdk8Wz-8/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	611	2025-04-16 02:00:46.992
4MqfGO81Lus	I Made BETTER Money	https://www.youtube.com/watch?v=4MqfGO81Lus	https://img.youtube.com/vi/4MqfGO81Lus/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	506	2025-04-16 02:00:46.867
xq6i2Gz2b34	I FIXED the United States	https://www.youtube.com/watch?v=xq6i2Gz2b34	https://img.youtube.com/vi/xq6i2Gz2b34/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	382	2025-04-16 02:00:46.866
pezlnN4X52g	A Sudoku Secret to Blow Your Mind - Numberphile	https://www.youtube.com/watch?v=pezlnN4X52g	https://img.youtube.com/vi/pezlnN4X52g/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	368	2025-04-16 02:00:46.73
8JuuGjRhSYE	How Actually Crazy is This Mess?	https://www.youtube.com/watch?v=8JuuGjRhSYE	https://img.youtube.com/vi/8JuuGjRhSYE/0.jpg	WATCH_LATER	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	1123	2025-04-16 02:48:59.771
_2NGHZf2Myc	How Did English "Spawn" In Your Head? - And Why It Is Better	https://www.youtube.com/watch?v=_2NGHZf2Myc	https://img.youtube.com/vi/_2NGHZf2Myc/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	315	2025-04-16 02:00:46.875
D9RRDypgBOI	When You're The Best In The World But No One Cares	https://www.youtube.com/watch?v=D9RRDypgBOI	https://img.youtube.com/vi/D9RRDypgBOI/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	412	2025-04-16 02:48:41.311
azDaPm13CT8	Which Font Makes the Best ⌶-Beam?	https://www.youtube.com/watch?v=azDaPm13CT8	https://img.youtube.com/vi/azDaPm13CT8/0.jpg	WATCHED	0	873c9f07-9a93-4ad9-9e79-a6a44002da6e	\N	797	2025-04-16 02:47:47.405
\.


--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.playlists (id, title, "userId", "thumbnailUrl", "createdAt", "updatedAt", "durationSeconds") FROM stdin;
PLQSoWXSpjA38zfNaTtrYqVc2D4giF-FnI	Skyblock	873c9f07-9a93-4ad9-9e79-a6a44002da6e	https://i.ytimg.com/vi/pPmo21gkETU/hqdefault.jpg	2025-04-16 02:36:17.739	2025-04-16 02:36:20.587	7763
PLkkocI7Ffe0a4bS57kt4KFBaHsCPyS7Xy	How Hamilton Works	6fdf3647-36ff-4c8f-a5e0-86357759477c	https://i.ytimg.com/vi/1qXsFs2ywMo/hqdefault.jpg	2025-04-16 00:14:09.705	2025-04-16 00:14:15.192	13053
PL5LiOvrbVo8keeEWRZVaHfprU4zQTCsV4	Logical Redstone Reloaded	6fdf3647-36ff-4c8f-a5e0-86357759477c	https://i.ytimg.com/vi/BH0j4qQORqE/hqdefault.jpg	2025-04-16 00:16:31.379	2025-04-16 00:16:35.034	10342
\.


--
-- Name: Suggestion Suggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Suggestion"
    ADD CONSTRAINT "Suggestion_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: Suggestion_fromUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Suggestion_fromUserId_idx" ON public."Suggestion" USING btree ("fromUserId");


--
-- Name: Suggestion_toUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Suggestion_toUserId_idx" ON public."Suggestion" USING btree ("toUserId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Suggestion Suggestion_fromUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Suggestion"
    ADD CONSTRAINT "Suggestion_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Suggestion Suggestion_toUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Suggestion"
    ADD CONSTRAINT "Suggestion_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cards cards_playlistId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT "cards_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES public.playlists(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cards cards_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT "cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: playlists playlists_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

