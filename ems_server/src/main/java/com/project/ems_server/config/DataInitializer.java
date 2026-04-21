package com.project.ems_server.config;

import com.project.ems_server.entity.Venue;
import com.project.ems_server.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final VenueRepository venueRepository;

    @Override
    public void run(String... args) throws Exception {
        if (venueRepository.count() == 0) {
            Venue auditorium = Venue.builder()
                    .name("Auditorium")
                    .capacity(500)
                    .location("Main Building")
                    .build();
            venueRepository.save(auditorium);

            Venue lectureHall1 = Venue.builder()
                    .name("Lecture Hall 1")
                    .capacity(100)
                    .location("Block A")
                    .build();
            venueRepository.save(lectureHall1);

            Venue lectureHall2 = Venue.builder()
                    .name("Lecture Hall 2")
                    .capacity(100)
                    .location("Block A")
                    .build();
            venueRepository.save(lectureHall2);

            Venue ictWorkshop = Venue.builder()
                    .name("ICT Workshop")
                    .capacity(50)
                    .location("IT Building")
                    .build();
            venueRepository.save(ictWorkshop);
        }
    }
}