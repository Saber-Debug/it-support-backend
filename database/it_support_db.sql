-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 15, 2026 at 04:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `it_support_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ticket`
--

CREATE TABLE `ticket` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(191) NOT NULL,
  `priority` varchar(191) NOT NULL DEFAULT 'NORMAL',
  `status` varchar(191) NOT NULL DEFAULT 'PENDING',
  `reporter` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `image` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket`
--

INSERT INTO `ticket` (`id`, `title`, `description`, `category`, `priority`, `status`, `reporter`, `createdAt`, `updatedAt`, `image`) VALUES
(1, 'test', 'test test', 'Hardware', 'NORMAL', 'COMPLETED', 'test', '2026-09-01 04:01:10.003', '2026-09-15 02:22:26.471', '/uploads/1788235269910-386233946.jpg'),
(2, 'test2', 'test test2', 'Software', 'URGENT', 'PENDING', 'test2', '2026-09-01 04:01:42.995', '2026-09-01 04:01:42.995', '/uploads/1788235302989-427743606.png'),
(3, 'test3', 'test test3', 'Network', 'CRITICAL', 'COMPLETED', 'test3', '2026-09-01 04:02:11.060', '2026-09-15 02:22:28.382', '/uploads/1788235331044-184800415.jpg'),
(4, 'test4', 'test test4', 'Network', 'CRITICAL', 'IN_PROGRESS', 'test4', '2026-09-01 04:05:28.958', '2026-09-15 02:22:23.987', '/uploads/1788235528937-847646308.jpeg');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ticket`
--
ALTER TABLE `ticket`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ticket`
--
ALTER TABLE `ticket`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
