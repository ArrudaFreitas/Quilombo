package com.quilombo.page;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PageSectionRepository extends JpaRepository<PageSection, Long> {

    List<PageSection> findByActiveTrueOrderByOrderIndexAsc();
}
