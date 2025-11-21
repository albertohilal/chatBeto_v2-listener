-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 21-11-2025 a las 08:40:05
-- Versión del servidor: 10.11.14-MariaDB-cll-lve-log
-- Versión de PHP: 8.4.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `iunaorg_chatBeto_v2`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `api_calls`
--

CREATE TABLE `api_calls` (
  `id` varchar(36) NOT NULL,
  `endpoint` varchar(100) DEFAULT NULL,
  `request` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`request`)),
  `response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response`)),
  `model` varchar(100) DEFAULT NULL,
  `tokens_input` int(11) DEFAULT NULL,
  `tokens_output` int(11) DEFAULT NULL,
  `cost` decimal(12,6) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conversations`
--

CREATE TABLE `conversations` (
  `id` varchar(36) NOT NULL,
  `conversation_id` varchar(100) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `default_model_slug` varchar(100) DEFAULT NULL,
  `openai_thread_id` varchar(100) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_at_ms` bigint(20) DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `is_archived` tinyint(1) DEFAULT 0,
  `is_starred` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` varchar(36) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `source_url` varchar(1000) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `text` longtext DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `embeddings`
--

CREATE TABLE `embeddings` (
  `id` varchar(36) NOT NULL,
  `document_id` varchar(36) NOT NULL,
  `chunk_index` int(11) NOT NULL,
  `vector` mediumblob DEFAULT NULL,
  `vector_dim` int(11) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT current_timestamp(3),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `messages`
--

CREATE TABLE `messages` (
  `id` varchar(36) NOT NULL,
  `conversation_id` varchar(36) NOT NULL,
  `parent_message_id` varchar(36) DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `content_type` varchar(50) DEFAULT 'text',
  `created_at` datetime(3) DEFAULT NULL,
  `created_at_ms` bigint(20) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'finished_successfully',
  `metadata` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `api_calls`
--
ALTER TABLE `api_calls`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `created_at` (`created_at`);

--
-- Indices de la tabla `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `embeddings`
--
ALTER TABLE `embeddings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `document_id` (`document_id`),
  ADD KEY `chunk_index` (`chunk_index`);

--
-- Indices de la tabla `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `conversation_id` (`conversation_id`),
  ADD KEY `created_at` (`created_at`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
