package com.project.ems_server.repository;

import com.project.ems_server.entity.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VenueRepository extends JpaRepository<Venue, Long> {
    Optional<Venue> findByName(String name);

    Optional<Venue> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
